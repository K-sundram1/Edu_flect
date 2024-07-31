const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const crypto = require("crypto");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const mongoose = require("mongoose");
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const CourseProgress = require("../models/CourseProgress");

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.id;
  
  if (!courses || courses.length === 0) {
    return res.status(400).json({ success: false, message: "Please Provide Course ID" });
  }

  try {
    // Find all courses in one go
    const courseDetails = await Course.find({ _id: { $in: courses } });

    if (courseDetails.length !== courses.length) {
      return res.status(404).json({ success: false, message: "Could not find one or more courses" });
    }

    let total_amount = 0;
    for (const course of courseDetails) {
      if (course.studentsEnroled.includes(userId)) {
        return res.status(400).json({ success: false, message: `Already enrolled in course: ${course._id}` });
      }
      total_amount += course.price;
    }

    const options = {
      amount: total_amount * 100,
      currency: "INR",
      receipt: Math.random(Date.now()).toString(),
    };

    const paymentResponse = await instance.orders.create(options);
    res.json({
      success: true,
      data: paymentResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not initiate order." });
  }
};

// Verify the payment
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courses } = req.body;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
    return res.status(400).json({ success: false, message: "Payment Failed" });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    try {
      await enrollStudents(courses, userId, res);
      return res.status(200).json({ success: true, message: "Payment Verified" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Enrollment Failed" });
    }
  } else {
    return res.status(400).json({ success: false, message: "Payment Verification Failed" });
  }
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({ success: false, message: "Please provide all the details" });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );

    res.status(200).json({ success: true, message: "Payment success email sent" });
  } catch (error) {
    console.error("Error in sending mail", error);
    res.status(500).json({ success: false, message: "Could not send email" });
  }
};

// Enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({ success: false, message: "Please Provide Course ID and User ID" });
  }

  try {
    for (const courseId of courses) {
      const enrolledCourse = await Course.findByIdAndUpdate(
        courseId,
        { $push: { studentsEnroled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        throw new Error(`Course not found: ${courseId}`);
      }

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      });

      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      );

      await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      );
    }

    return res.status(200).json({ success: true, message: "Enrollment Successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
