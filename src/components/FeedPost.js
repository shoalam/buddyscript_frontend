'use client';

import { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '@/utils/media';
import CommentItem from './CommentItem';
import { toggleLikeAction, getLikersAction, getCommentsAction, addCommentAction } from '@/app/actions/interactionActions';

const timeAgo = (date) => {
  if (!date) return "some time ago";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  return Math.floor(seconds) + " seconds ago";
};

// Helper to build a nested reply tree from a flat array
const buildCommentTree = (comments) => {
  const commentMap = {};
  const roots = [];
  
  // First pass: map each comment and ensure it has a replies array
  comments.forEach(comment => {
    commentMap[comment._id] = { ...comment, replies: [] };
  });
  
  // Second pass: hook children to parents
  comments.forEach(comment => {
    if (comment.parentComment) {
      // It's a reply
      if (commentMap[comment.parentComment]) {
        commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
      } else {
         // Parent not found (e.g. deleted), push to roots or ignore. We'll push to roots for safety.
         roots.push(commentMap[comment._id]);
      }
    } else {
      // It's a top-level comment
      roots.push(commentMap[comment._id]);
    }
  });
  
  return roots;
};

export default function FeedPost({ _id, user, activeUser, createdAt, content, mediaUrl, likesCount: initialLikesCount = 0, commentsCount: initialCommentsCount = 0, shares = 0 }) {

  const [mounted, setMounted] = useState(false);
  
  // Interaction States
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likersList, setLikersList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [commentsFetched, setCommentsFetched] = useState(false);
  
  // Comment Form States
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dropdown States
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // General Mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Likers 
  useEffect(() => {
    let isMounted = true;
    async function checkLikers() {
      if (!_id || !activeUser?._id) return;
      const res = await getLikersAction(_id);
      if (res.success && isMounted) {
        // Find if active user is in likers array
        const userLiked = res.likers.some(liker => 
            liker.user?._id === activeUser._id || liker.user === activeUser._id
        );
        setIsLiked(userLiked);
        
        // Save recent likers for display (up to 5 for the UI)
        setLikersList(res.likers.slice(0, 5));
      }
    }
    checkLikers();
    return () => { isMounted = false; };
  }, [_id, activeUser?._id]);

  // Fetch Comments
  useEffect(() => {
    let isMounted = true;
    async function fetchComments() {
      if (!_id) return;
      const res = await getCommentsAction(_id);
      if (res.success && isMounted) {
        setCommentsList(buildCommentTree(res.comments));
        setCommentsCount(res.comments.length);
        setCommentsFetched(true);
      }
    }
    fetchComments();
    return () => { isMounted = false; };
  }, [_id]);

  // Handle Outside Click for Dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const author = user?.username || 'Unknown';
  const authorImg = getImageUrl(user?.profilePic) || '/images/user_avatar.svg';
  const time = mounted ? timeAgo(createdAt) : 'Just now';
  const image = getImageUrl(mediaUrl);

  const handleLike = async () => {
    if (!activeUser) return;
    
    // Optimistic UI update
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;
    const previousLikersList = [...likersList];

    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    if (isLiked) {
       // Remove activeUser from likersList
       setLikersList(prev => prev.filter(liker => liker.user?._id !== activeUser._id));
    } else {
       // Add activeUser to likersList
       setLikersList(prev => [{ user: activeUser }, ...prev].slice(0, 5));
    }

    const res = await toggleLikeAction(_id, 'Post');
    
    if (!res.success) {
      // Revert if API fails
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      setLikersList(previousLikersList);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    // No parent needed for top-level comment
    const res = await addCommentAction(_id, commentInput);
    
    if (res.success) {
      // Append new comment to top-level list
      setCommentsList(prev => [...prev, { ...res.comment, replies: [] }]);
      setCommentsCount(prev => prev + 1);
      setCommentInput('');
    }
    
    setIsSubmitting(false);
  };

  const handleReplyAdded = (newReply) => {
     // Re-trigger comments fetch to rebuild tree correctly
     // This is the simplest way to handle nested state without complex deep cloning
     async function refetch() {
         const res = await getCommentsAction(_id);
         if (res.success) {
            setCommentsList(buildCommentTree(res.comments));
            setCommentsCount(res.comments.length);
         }
     }
     refetch();
  };

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">

        {/* Post Header */}
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={authorImg} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{author}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {time} .{' '}
                <a href="#0">Public</a>
              </p>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="_feed_inner_timeline_post_box_dropdown" ref={dropdownRef}>
            <div className="_feed_timeline_post_dropdown">
              <button
                id="_timeline_show_drop_btn"
                className="_feed_timeline_post_dropdown_link"
                onClick={() => setDropdownOpen(prev => !prev)}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>

            {dropdownOpen && (
              <div className="_feed_timeline_dropdown show">
                <ul className="_feed_timeline_dropdown_list">
                  <li className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link">
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                          <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z" />
                        </svg>
                      </span>
                      Save Post
                    </a>
                  </li>
                  <li className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link">
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                          <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 2.25H3.75a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5zM6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5" />
                        </svg>
                      </span>
                      Hide
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Post Title */}
        <h4 className="_feed_inner_timeline_post_title">{content}</h4>

        {/* Post Image */}
        {image && (
          <div className="_feed_inner_timeline_image">
            <img src={image} alt="" className="_time_img" />
          </div>
        )}
      </div>

      {/* Total Reacts Row */}
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image" style={{ display: 'flex', alignItems: 'center' }}>
          {likesCount > 0 ? (
            <>
                {likersList.map((liker, index) => {
                   const imgClass = index === 0 ? '_react_img1' : (index > 2 ? '_react_img _rect_img_mbl_none' : '_react_img');
                   return (
                     <img 
                       key={liker._id || index}
                       src={getImageUrl(liker.user?.profilePic) || "/images/user_avatar.svg"} 
                       alt={liker.user?.username || 'User'} 
                       title={liker.user?.username}
                       className={imgClass} 
                       style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', marginLeft: index > 0 ? '-10px' : '0' }}
                     />
                   );
                })}
                <p className="_feed_inner_timeline_total_reacts_para" style={{ marginLeft: '8px' }}>{likesCount}</p>
            </>
          ) : (
             <p className="_feed_inner_timeline_total_reacts_para">0 Reactions</p>
          )}
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">

          <p className="_feed_inner_timeline_total_reacts_para1">
            <a href="#0"><span>{commentsCount}</span> Comment(s)</a>
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2"><span>{shares}</span> Share</p>
        </div>
      </div>

      {/* Reaction Bar */}
      <div className="_feed_inner_timeline_reaction">
        <button 
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${isLiked ? '_feed_reaction_active' : ''}`}
          onClick={handleLike}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "#1890FF" : "none"} stroke={isLiked ? "#1890FF" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
               </svg>
               <span style={{ marginLeft: "6px", color: isLiked ? "#1890FF" : "inherit" }}>Like</span>
            </span>
          </span>
        </button>

        <button className="_feed_inner_timeline_reaction_comment _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21">
                <path stroke="#000" d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z" />
                <path stroke="#000" strokeLinecap="round" strokeLinejoin="round" d="M6.938 9.313h7.125M10.5 14.063h3.563" />
              </svg>
              Comment
            </span>
          </span>
        </button>

        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="24" height="21" fill="none" viewBox="0 0 24 21">
                <path stroke="#000" strokeLinejoin="round" d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z" />
              </svg>
              Share
            </span>
          </span>
        </button>
      </div>

      {/* Main Post Comment Input Box */}
      <div className="_feed_inner_timeline_cooment_area" style={{marginBottom: "20px"}}>
        <div className="_feed_inner_comment_box">
          <form className="_feed_inner_comment_box_form" onSubmit={handleCommentSubmit} style={{alignItems: "center"}}>
            <div className="_feed_inner_comment_box_content" style={{flex: 1, border: '1px solid #E4E6EB', borderRadius: '20px', padding: '2px 10px', display: 'flex', alignItems: 'center'}}>
              <div className="_feed_inner_comment_box_content_image">
                <img src={getImageUrl(activeUser?.profilePic) || "/images/user_avatar.svg"} alt="" className="_comment_img" />
              </div>
              <div className="_feed_inner_comment_box_content_txt" style={{flex: 1}}>
                <input 
                    type="text"
                    className="form-control _comment_textarea" 
                    placeholder="Write a comment..." 
                    style={{minHeight: 'auto', padding: '8px 5px', border: 'none', boxShadow: 'none'}}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="_feed_inner_comment_box_icon">
               <button type="submit" disabled={isSubmitting || !commentInput.trim()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1890FF', fontWeight: 'bold', marginLeft: '10px' }}>
                {isSubmitting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Comments Thread Rendering */}
      {commentsCount > 0 && (
         <div className="_timline_comment_main" style={{padding: '0 24px'}}>
             {/* Map over the roots of the comment tree */}
             {commentsList.map(comment => (
                 <CommentItem 
                    key={comment._id} 
                    comment={comment} 
                    postId={_id} 
                    activeUser={activeUser}
                    onReplyAdded={handleReplyAdded}
                 />
             ))}
         </div>
      )}
    </div>
  );
}
