import React, { useState, ChangeEvent, FormEvent } from 'react';
import styles from './Login.module.css';
import amieLogo from '../../assets/amie_logo.png'; // Import the logo
// Import strings
import * as AppStrings from '../../constants/strings';
import { authApi, LoginCredentials } from '../../api'; // Import API functions and types
import Modal from '../common/Modal'; // Import Modal component
import { useGoogleLogin, TokenResponse } from '@react-oauth/google'; // Import useGoogleLogin

// Kakao Icon SVG Component
const KakaoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9 9 0 0 0 8 15"/>
    </svg>
);

// Define props for Login component
interface LoginProps {
    onLoginSuccess: (token: string) => void; // Pass token up on success
    onStartSignup: () => void; // 회원가입 시작 콜백 추가
    onStartSocialSignup: (provider: 'google' | 'kakao', socialEmail: string) => void; // Add this prop
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onStartSignup, onStartSocialSignup }) => {
    // const navigate = useNavigate(); // useNavigate 제거
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state
    const [error, setError] = useState<string | null>(null); // Error state
    const [isKakaoModalOpen, setIsKakaoModalOpen] = useState<boolean>(false); // State for Kakao modal

    // Type the event handlers
    const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
    };

    const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    };

    const handleRememberMeChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRememberMe(event.target.checked);
    };

    const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        // 이전에 저장된 토큰이나 채팅방 ID만 제거하고 auto search 설정은 유지
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access_token');
        localStorage.removeItem('currentChatRoomId');

        const credentials: LoginCredentials = { email, password };

        try {
            const response = await authApi.login(credentials);

            if (response.success && response.token) {
                localStorage.setItem('accessToken', response.token);
                localStorage.removeItem('access_token');
                // TODO: Implement rememberMe functionality if needed
                if (rememberMe) {
                    // localStorage.setItem('rememberMe', 'true'); // Example
                }
                onLoginSuccess(response.token); // Notify parent component of success
                window.location.reload(); // 로그인 성공 시 리프레시
            } else {
                throw new Error(response.message || '로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
            }

        } catch (err: any) {
            console.error('로그인 오류:', err);
            setError("로그인 실패. 이메일 또는 비밀번호를 확인하세요.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Google Login Implementation --- 
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse: Omit<TokenResponse, 'error' | 'error_description' | 'error_uri'>) => {
            setIsLoading(true);
            setError(null);

            const accessToken = tokenResponse.access_token;

            if (!accessToken) {
                console.error('Google login did not return access token.');
                setError('Google login failed: No access token received.');
                setIsLoading(false);
                return;
            }

            try {
                // 소셜 로그인 토큰 저장
                localStorage.setItem('access_token', accessToken);

                const backendResponse = await authApi.socialLogin({ 
                    provider: 'google', 
                    token: accessToken 
                });

                if (backendResponse.success && backendResponse.token) {
                    // 인증 관련 localStorage 항목 설정 - auto search 설정은 그대로 유지
                    localStorage.setItem('accessToken', backendResponse.token);
                    onLoginSuccess(backendResponse.token);
                    window.location.reload(); // 소셜 로그인 성공 시 리프레시
                } else if (!backendResponse.success && backendResponse.error?.includes('회원가입이 필요합니다')) {
                    // Call the function passed from App.tsx to start social signup
                    // Safely access provider and socialEmail from the response
                    const provider = backendResponse.provider; // Assuming provider is always present
                    const socialEmail = backendResponse.socialEmail;
                    
                    if (provider && socialEmail) {
                        onStartSocialSignup(provider, socialEmail); // Uncommented and call the actual function
                    } else {
                        console.error("Missing provider or socialEmail in backend response for social signup.");
                        setError('소셜 로그인 정보를 받아오지 못했습니다.'); // Show error if needed data is missing
                    }
                } else {
                    // Handle other backend errors
                    throw new Error(backendResponse.message || backendResponse.error || 'Google login failed on backend.');
                }
            } catch (err: any) {
                console.error('Backend social login error:', err);
                setError(err.message || 'Failed to process Google login.');
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => {
            console.error('Google Login Failed');
            setError('Google login process failed.');
            setIsLoading(false);
        },
        flow: 'implicit'
    });

    // Wrapper function for the button onClick
    const handleGoogleLoginClick = () => {
        setError(null);
        setIsLoading(true);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access_token');
        localStorage.removeItem('currentChatRoomId');
        googleLogin();
    };

    const handleKakaoLogin = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access_token');
        localStorage.removeItem('currentChatRoomId');
        setIsKakaoModalOpen(true);
    };

    const closeKakaoModal = () => setIsKakaoModalOpen(false);

    // --- 회원가입 시작 핸들러 ---
    const handleStartSignupClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault(); // 기본 동작 방지
        onStartSignup(); // 부모 컴포넌트(App)에 알림
    };

    return (
        <div className={styles.loginContainer}>
            <img src={amieLogo} alt="Amié Logo" className={styles.logo} />
            <p className={styles.subtitle}>{AppStrings.LOGIN_SUBTITLE}</p>

            <form onSubmit={handleEmailLogin}>
                <input
                    type="email"
                    placeholder={AppStrings.LOGIN_EMAIL_PLACEHOLDER}
                    value={email}
                    onChange={handleEmailChange}
                    required
                    className={styles.inputField}
                    disabled={isLoading} // Disable input while loading
                />
                <input
                    type="password"
                    placeholder={AppStrings.LOGIN_PASSWORD_PLACEHOLDER}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    className={styles.inputField}
                    disabled={isLoading} // Disable input while loading
                />
                {/* Error Message Display */}
                {error && <p className={styles.errorMessage}>{error}</p>}

                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isLoading}>
                    {isLoading ? '로그인 중...' : AppStrings.LOGIN_BUTTON_EMAIL}
                </button>

                <div className={styles.options}>
                    <label className={styles.rememberMe}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={handleRememberMeChange}
                        /> {AppStrings.LOGIN_REMEMBER_ME}
                    </label>
                    <a href="#" className={styles.forgotPassword}>{AppStrings.LOGIN_FORGOT_PASSWORD}</a>
                </div>
            </form>

            <div className={styles.separator}>
                <hr />
                <span>{AppStrings.LOGIN_SEPARATOR_TEXT}</span>
                <hr />
            </div>

            <button 
                type="button" 
                onClick={handleGoogleLoginClick} // Use the wrapper function
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnGoogle}`} 
                disabled={isLoading} // Disable button while loading
            >
                <img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="Google logo" />
                 {isLoading ? 'Processing...' : AppStrings.LOGIN_BUTTON_GOOGLE}
            </button>
            <button type="button" onClick={handleKakaoLogin} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnKakao}`} disabled={isLoading}>
                <KakaoIcon />
                 {isLoading ? '처리 중...' : AppStrings.LOGIN_BUTTON_KAKAO}
            </button>

            <p className={styles.signupLink}>
                {AppStrings.LOGIN_SIGNUP_PROMPT} <a href="#" onClick={handleStartSignupClick}>{AppStrings.LOGIN_SIGNUP_LINK}</a>
            </p>

            {/* Kakao Login Placeholder Modal */}
            <Modal 
                isOpen={isKakaoModalOpen}
                onClose={closeKakaoModal}
                title={AppStrings.KAKAO_LOGIN_MODAL_TITLE}
            >
                <p>{AppStrings.KAKAO_LOGIN_MODAL_MESSAGE}</p>
                <button 
                    onClick={closeKakaoModal} 
                    className={styles.modalCloseBtn}
                >
                    {AppStrings.KAKAO_LOGIN_MODAL_CONFIRM_BUTTON}
                </button>
            </Modal>
        </div>
    );
};

export default Login; 