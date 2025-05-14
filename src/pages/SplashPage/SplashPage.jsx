import React, { useEffect } from 'react'
import styles from './SplashPage.module.scss'
import { useNavigate } from 'react-router-dom'

const SplashPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() =>{
            navigate('/notebook-manager');
        }, 1000);

        return () => clearTimeout(timer);
    }, [navigate]); 

    return (
        <div className={styles.splash_screen}>
            <h1>Splash-screen</h1>
        </div>
    )
}

export default SplashPage
