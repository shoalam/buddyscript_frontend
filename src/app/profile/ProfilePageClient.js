'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { updateProfileAction } from '../actions/authActions';
import { useToast } from '@/components/ToastProvider';
import { getImageUrl } from '@/utils/media';

export default function ProfilePageClient({ initialUser }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState(initialUser?.username || '');
  const [firstName, setFirstName] = useState(initialUser?.firstName || '');
  const [lastName, setLastName] = useState(initialUser?.lastName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  
  // Real-time preview of the newly selected image
  const [imagePreview, setImagePreview] = useState(getImageUrl(initialUser?.profilePic) || '/images/user_avatar.svg');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    
    if (password) {
      formData.append('password', password);
    }
    if (profilePic) {
      formData.append('profilePic', profilePic);
    }

    const res = await updateProfileAction(null, formData);

    if (!res.success && res.error) {
       toast.error(typeof res.error === 'string' ? res.error : 'Failed to update profile');
    } else {
       toast.success('Profile updated successfully!');
       router.refresh(); // Refresh to update server components with new user data
       setPassword(''); // Clear password field after success
    }

    setIsSubmitting(false);
  };

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
                  
                  {/* Profile Edit Box */}
                  <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16" style={{ padding: '30px' }}>
                     <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Edit Profile</h2>
                     
                     <form onSubmit={handleSubmit}>
                        
                        {/* Profile Picture Upload Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                           <div 
                              style={{ 
                                width: '150px', 
                                height: '150px', 
                                borderRadius: '50%', 
                                overflow: 'hidden', 
                                border: '3px solid #1890FF',
                                marginBottom: '15px',
                                position: 'relative'
                              }}
                           >
                              <img 
                                src={imagePreview} 
                                alt="Profile Preview" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                   e.target.onerror = null;
                                   e.target.src = '/images/user_avatar.svg';
                                }}
                              />
                           </div>
                           <input 
                             type="file" 
                             accept="image/*" 
                             ref={fileInputRef} 
                             onChange={handleImageChange}
                             style={{ display: 'none' }}
                           />
                           <button 
                             type="button" 
                             onClick={() => fileInputRef.current.click()}
                             style={{
                               padding: '8px 16px',
                               backgroundColor: '#F0F2F5',
                               border: 'none',
                               borderRadius: '6px',
                               cursor: 'pointer',
                               fontWeight: '600'
                             }}
                           >
                             Change Profile Picture
                           </button>
                        </div>

                        <div className="row">
                           <div className="col-md-6">
                              <div className="form-group" style={{ marginBottom: '20px' }}>
                                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>First Name</label>
                                 <input 
                                   type="text" 
                                   className="form-control" 
                                   value={firstName}
                                   onChange={(e) => setFirstName(e.target.value)}
                                   required
                                   style={{ padding: '12px', borderRadius: '6px', border: '1px solid #D5D6D8' }}
                                 />
                              </div>
                           </div>
                           <div className="col-md-6">
                              <div className="form-group" style={{ marginBottom: '20px' }}>
                                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Last Name</label>
                                 <input 
                                   type="text" 
                                   className="form-control" 
                                   value={lastName}
                                   onChange={(e) => setLastName(e.target.value)}
                                   required
                                   style={{ padding: '12px', borderRadius: '6px', border: '1px solid #D5D6D8' }}
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                           <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Username</label>
                           <input 
                             type="text" 
                             className="form-control" 
                             value={username}
                             onChange={(e) => setUsername(e.target.value)}
                             required
                             style={{ padding: '12px', borderRadius: '6px', border: '1px solid #D5D6D8' }}
                           />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                           <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Email Address</label>
                           <input 
                             type="email" 
                             className="form-control" 
                             value={email}
                             onChange={(e) => setEmail(e.target.value)}
                             required
                             style={{ padding: '12px', borderRadius: '6px', border: '1px solid #D5D6D8' }}
                           />
                        </div>

                        <div className="form-group" style={{ marginBottom: '30px' }}>
                           <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>New Password (Optional)</label>
                           <input 
                             type="password" 
                             className="form-control" 
                             value={password}
                             onChange={(e) => setPassword(e.target.value)}
                             placeholder="Leave blank to keep current password"
                             style={{ padding: '12px', borderRadius: '6px', border: '1px solid #D5D6D8' }}
                           />
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          style={{
                               width: '100%',
                               padding: '12px',
                               backgroundColor: '#1890FF',
                               color: 'white',
                               border: 'none',
                               borderRadius: '6px',
                               fontSize: '16px',
                               fontWeight: 'bold',
                               cursor: isSubmitting ? 'not-allowed' : 'pointer',
                               opacity: isSubmitting ? 0.7 : 1
                          }}
                        >
                          {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
                        </button>

                     </form>
                  </div>

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
