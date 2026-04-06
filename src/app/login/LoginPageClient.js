'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '../actions/authActions';
import { useToast } from '@/components/ToastProvider';

export default function LoginPage() {

  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state?.success) {
      setIsRedirecting(true);
      toast.success('Logged in successfully!');
      router.push('/feed');
      router.refresh();
    } else if (state?.error) {
      const errorMsg = typeof state.error === 'string'
        ? state.error
        : 'Please check the form for errors';
      toast.error(errorMsg);
    }
  }, [state, router, toast]);

  return (
    <section className="_social_login_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src="/images/shape1.svg" alt="" className="_shape_img" />
        <img src="/images/dark_shape.svg" alt="" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src="/images/shape2.svg" alt="" className="_shape_img" />
        <img src="/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_shape_three">
        <img src="/images/shape3.svg" alt="" className="_shape_img" />
        <img src="/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_social_login_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-7 col-lg-7 col-md-12 col-sm-12">
              <div className="_social_login_left">
                <div className="_social_login_left_image">
                  <img src="/images/login.png" alt="Image" className="_left_img" />
                </div>
              </div>
            </div>
            <div className="col-xl-5 col-lg-5 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <img src="/images/logo.svg" alt="Image" className="_left_logo" />
                </div>
                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                <h4 className="_social_login_content_title _titl4 _mar_b50">Login to your account</h4>
                <button type="button" className="_social_login_content_btn _mar_b40">
                  <img src="/images/google.svg" alt="Image" className="_google_img" /> <span>Or sign-in with google</span>
                </button>
                <div className="_social_login_content_bottom_txt _mar_b40"> <span>Or</span>
                </div>


                <form action={formAction} className="_social_login_form">
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8">Email</label>
                        <input
                          name="email"
                          type="email"
                          className={`form-control _social_login_input ${state?.error?.email ? 'is-invalid' : ''}`}
                          required
                        />
                        {state?.error?.email && (
                          <div className="invalid-feedback d-block">{state.error.email[0]}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8">Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className={`form-control _social_login_input ${state?.error?.password ? 'is-invalid' : ''}`}
                            required
                          />
                          <button
                            type="button"
                            className="password_toggle_btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', width: '20px', height: '20px' }}
                          >
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.04m2.458-2.821A9.99 9.99 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.059 10.059 0 01-4.294 5.75m-4.329-3.951A3.3 3.3 0 0115 12c0 .406-.01.812-.01 1.218M9.88 9.88l6.24 6.24m-1.24-11l-6.24 6.24m0 0a3 3 0 104.24 4.24" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {state?.error?.password && (
                          <div className="invalid-feedback d-block">{state.error.password[0]}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="form-check _social_login_form_check">
                        <input className="form-check-input _social_login_form_check_input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" defaultChecked />
                        <label className="form-check-label _social_login_form_check_label" htmlFor="flexRadioDefault2">Remember me</label>
                      </div>
                    </div>
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="_social_login_form_left">
                        <p className="_social_login_form_left_para">Forgot password?</p>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_login_form_btn _mar_t40 _mar_b60">
                        <button
                          disabled={isPending || isRedirecting}
                          type="submit"
                          className="_social_login_form_btn_link _btn1"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                          {isPending || isRedirecting ? (
                            <>
                              <span className="spinner"></span>
                              <span>Logging in...</span>
                            </>
                          ) : (
                            'Login now'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">Dont have an account? <Link href="/registration">Create New Account</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
