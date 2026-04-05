import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import StorySection from "@/components/StorySection";
import FeedPost from "@/components/FeedPost";
import CreatePost from "@/components/CreatePost";
import { getPostsAction } from "../actions/postActions";
import { getMeAction } from "../actions/authActions";

import { cookies } from "next/headers";

import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!token && !refreshToken) {
    redirect('/login');
  }


  const [{ posts, error }, meRes] = await Promise.all([
    getPostsAction(),
    getMeAction()
  ]);

  const activeUser = meRes?.user || null;

  return (

    <div className="_main_layout">
      <Navbar />

      <div className="container _custom_container">
        <div className="_layout_inner_wrap">
          <div className="row">
            {/* Left Sidebar */}
            <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
              <LeftSidebar />
            </div>

            {/* Layout Middle */}
            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
              <div className="_layout_middle_wrap">
                <div className="_layout_middle_inner">
                  <StorySection />

                  <CreatePost />

                  {error && <div className="alert alert-danger">{error}</div>}

                  {posts && posts.map((post) => (
                    <FeedPost key={post._id} {...post} activeUser={activeUser} />
                  ))}



                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
