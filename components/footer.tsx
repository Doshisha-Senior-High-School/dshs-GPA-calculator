import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer style={{ textAlign: 'center', padding: '1em 0', background: '#f1f1f1' }}>
            <p className='font-medium' style={{ fontSize: '0.8em' }}>Doshisha Senior High School GPA calculator</p>
            <p className='font-extralight' style={{ fontSize: '0.4em' }}>&copy; 2024-{new Date().getFullYear()} Kanata Tsuda. All rights reserved.</p>
        </footer>
    );
};

export default Footer;