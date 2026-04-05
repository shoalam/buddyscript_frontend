'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUsersAction } from '@/app/actions/userActions';
import { getImageUrl } from '@/utils/media';

export default function RightSidebar() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const res = await getUsersAction();
      if (res?.users) {
        setUsers(res.users);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);
  return (
    <div className="_layout_right_sidebar_wrap">
      <div className="_layout_right_sidebar_inner">
        <div className="_right_inner_area_info _padd_t24 _padd_b24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_right_inner_area_info_content _mar_b24">
            <h4 className="_right_inner_area_info_content_title _title5">You Might Like</h4>
            <span className="_right_inner_area_info_content_txt">
              <Link className="_right_inner_area_info_content_txt_link" href="#0">See All</Link>
            </span>
          </div>
          <hr className="_underline" />
          <div className="_right_inner_area_info_ppl">
            <div className="_right_inner_area_info_box">
              <div className="_right_inner_area_info_box_image">
                <Link href="/profile">
                  <img src="/images/Avatar.png" alt="Image" className="_ppl_img" />
                </Link>
              </div>
              <div className="_right_inner_area_info_box_txt">
                <Link href="/profile">
                  <h4 className="_right_inner_area_info_box_title">Radovan SkillArena</h4>
                </Link>
                <p className="_right_inner_area_info_box_para">Founder & CEO at Trophy</p>
              </div>
            </div>
            <div className="_right_info_btn_grp">
              <button type="button" className="_right_info_btn_link">Ignore</button>
              <button type="button" className="_right_info_btn_link _right_info_btn_link_active">Follow</button>
            </div>
          </div>
        </div>
      </div>
      <div className="_layout_right_sidebar_inner">
        <div className="_feed_right_inner_area_card _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_feed_top_fixed">
            <div className="_feed_right_inner_area_card_content _mar_b24">
              <h4 className="_feed_right_inner_area_card_content_title _title5">Your Friends</h4>
              <span className="_feed_right_inner_area_card_content_txt">
                <Link className="_feed_right_inner_area_card_content_txt_link" href="/find-friends">See All</Link>
              </span>
            </div>
            <form className="_feed_right_inner_area_card_form">
              <svg className="_feed_right_inner_area_card_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
                <circle cx="7" cy="7" r="6" stroke="#666"></circle>
                <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3"></path>
              </svg>
              <input className="form-control me-2 _feed_right_inner_area_card_form_inpt" type="search" placeholder="input search text" aria-label="Search" />
            </form>
          </div>
          <div className="_feed_bottom_fixed">
            {loading ? (
               <div style={{ padding: '20px', textAlign: 'center' }}>Loading suggested users...</div>
            ) : users.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center' }}>No suggestions found.</div>
            ) : users.map((user, idx) => (
              <div key={user._id || idx} className="_feed_right_inner_area_card_ppl">
                <div className="_feed_right_inner_area_card_ppl_box">
                  <div className="_feed_right_inner_area_card_ppl_image">
                    <Link href={`/profile/${user._id}`}>
                      <img src={getImageUrl(user.profilePic) || '/images/user_avatar.svg'} alt={user.username} className="_box_ppl_img" />
                    </Link>
                  </div>
                  <div className="_feed_right_inner_area_card_ppl_txt">
                    <Link href={`/profile/${user._id}`}>
                      <h4 className="_feed_right_inner_area_card_ppl_title">{user.username}</h4>
                    </Link>
                    <p className="_feed_right_inner_area_card_ppl_para">Suggested Friend</p>
                  </div>
                </div>
                <div className="_feed_right_inner_area_card_ppl_side">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14">
                      <rect width="12" height="12" x="1" y="1" fill="#0ACF83" stroke="#fff" strokeWidth="2" rx="6" />
                    </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
