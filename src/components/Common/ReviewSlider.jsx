import React, { useEffect, useState } from "react";
import ReactStars from "react-rating-stars-component";
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import "../../App.css"; // Ensure this path is correct for your project structure
// Icons
import { FaStar } from "react-icons/fa";
// Import required modules
import { Autoplay, FreeMode, Pagination } from "swiper";

// Get apiFunction and the endpoint
import { apiConnector } from "../../services/apiConnector"
import { ratingsEndpoints } from "../../services/apis";

function ReviewSlider() {
  const [reviews, setReviews] = useState([]);
  const truncateWords = 15;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiConnector(
          "GET",
          ratingsEndpoints.REVIEWS_DETAILS_API
        );
        if (data?.success) {
          console.log("Fetched Reviews:", data?.data);
          setReviews(data?.data);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    })();
  }, []);

  return (
    <div className="text-white">
      <div className="my-[50px] h-[184px] max-w-maxContentTab lg:max-w-maxContent">
        <Swiper
          slidesPerView={4}
          spaceBetween={25}
          loop={true}
          freeMode={true}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          modules={[FreeMode, Pagination, Autoplay]}
          className="w-full "
        >
          {reviews.length > 0 ? reviews.map((review, i) => {
            const userName = `${review?.user?.firstName || ''} ${review?.user?.lastName || ''}`.trim();
            const courseName = review?.course?.courseName || '';
            const userImage = review?.user?.image || `https://api.dicebear.com/5.x/initials/svg?seed=${userName}`;
            const reviewText = review?.review || '';
            const truncatedReviewText = reviewText.split(" ").length > truncateWords
              ? `${reviewText.split(" ").slice(0, truncateWords).join(" ")} ...`
              : reviewText;

            return (
              <SwiperSlide key={i}>
                <div className="flex flex-col gap-3 bg-richblack-800 p-3 text-[14px] text-richblack-25">
                  <div className="flex items-center gap-4">
                    <img
                      src={userImage}
                      alt={userName}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <h1 className="font-semibold text-richblack-5">
                        {userName}
                      </h1>
                      <h2 className="text-[12px] font-medium text-richblack-500">
                        {courseName}
                      </h2>
                    </div>
                  </div>
                  <p className="font-medium text-richblack-25">
                    {truncatedReviewText}
                  </p>
                  <div className="flex items-center gap-2 ">
                    <h3 className="font-semibold text-yellow-100">
                      {review?.rating?.toFixed(1) || 'N/A'}
                    </h3>
                    <ReactStars
                      count={5}
                      value={review?.rating || 0}
                      size={20}
                      edit={false}
                      activeColor="#ffd700"
                      emptyIcon={<FaStar />}
                      fullIcon={<FaStar />}
                    />
                  </div>
                </div>
              </SwiperSlide>
            );
          }) : (
            <p className="text-center">No reviews available.</p>
          )}
        </Swiper>
      </div>
    </div>
  );
}

export default ReviewSlider;
