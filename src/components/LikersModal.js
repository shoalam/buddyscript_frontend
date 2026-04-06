'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLikersAction } from '@/app/actions/interactionActions';
import { getImageUrl } from '@/utils/media';

const REACTIONS = [
  { type: 'Like', icon: '👍', color: '#1890FF' },
  { type: 'Love', icon: '❤️', color: '#f9197f' },
  { type: 'Haha', icon: '😆', color: '#ffb900' },
  { type: 'Wow', icon: '😮', color: '#ffb900' },
  { type: 'Sad', icon: '😢', color: '#ffb900' },
  { type: 'Angry', icon: '😡', color: '#f05d51' },
];

const LikersModal = ({ 
  isOpen, 
  onClose, 
  targetId, 
  targetType = 'Post' 
}) => {
  const [likers, setLikers] = useState([]);
  const [countsByReaction, setCountsByReaction] = useState({});
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && targetId) {
      async function fetchLikers() {
        setLoading(true);
        const res = await getLikersAction(targetId, targetType);
        if (res.success) {
          setLikers(res.likers);
          setCountsByReaction(res.countsByReaction || {});
        }
        setLoading(false);
      }
      fetchLikers();
    }
  }, [isOpen, targetId]);

  const filteredLikers = activeTab === 'All' 
    ? likers 
    : likers.filter(l => l.reactionType === activeTab);

  if (!isOpen) return null;

  return (
    <div className="_confirmation_modal_overlay">
      <div className="_confirmation_modal_container _likers_modal_container" style={{ maxWidth: '400px' }}>
        <div className="_confirmation_modal_header" style={{ borderBottom: 'none' }}>
          <h4 className="_confirmation_modal_title">People who reacted</h4>
          <button className="_confirmation_modal_close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="_likers_modal_tabs" style={{ display: 'flex', gap: '15px', padding: '0 20px 10px', borderBottom: '1px solid #f0f0f0', overflowX: 'auto' }}>
            <button 
                onClick={() => setActiveTab('All')}
                style={{ background: 'none', border: 'none', padding: '5px 0', borderBottom: activeTab === 'All' ? '2px solid #1890FF' : 'none', color: activeTab === 'All' ? '#1890FF' : '#666', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
                All {likers.length > 0 && likers.length}
            </button>
            {REACTIONS.map(reac => countsByReaction[reac.type] > 0 && (
                <button 
                    key={reac.type}
                    onClick={() => setActiveTab(reac.type)}
                    style={{ background: 'none', border: 'none', padding: '5px 0', borderBottom: activeTab === reac.type ? '2px solid #1890FF' : 'none', color: activeTab === reac.type ? '#1890FF' : '#666', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                >
                    <span>{reac.icon}</span> {countsByReaction[reac.type]}
                </button>
            ))}
        </div>

        <div className="_confirmation_modal_body _likers_modal_body" style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px 0' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          ) : filteredLikers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>No reactions found for this category.</div>
          ) : (
            <ul className="_likers_list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredLikers.map((liker) => (
                <li key={liker._id} className="_likers_list_item" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="_liker_user_img_wrap">
                        <img 
                        src={getImageUrl(liker.user?.profilePic) || "/images/user_avatar.svg"} 
                        alt={liker.user?.username} 
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="_liker_user_info">
                        <Link 
                            href={`/profile/${liker.user?._id}`} 
                            className="_liker_user_name" 
                            style={{ fontWeight: '600', color: '#112032', textDecoration: 'none' }}
                            onClick={onClose}
                        >
                        {liker.user?.username || 'Unknown User'}
                        </Link>
                    </div>
                  </div>
                  <div className="_liker_reaction_icon" style={{ fontSize: '18px' }}>
                     {REACTIONS.find(r => r.type === liker.reactionType)?.icon || '👍'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="_confirmation_modal_footer">
          <button 
            type="button" 
            className="_confirmation_modal_btn _btn_cancel" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LikersModal;
