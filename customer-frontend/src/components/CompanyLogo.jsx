import React from 'react'; // Import React

const CompanyLogoPlaceholder = ({ className }) => (
    <svg className={className} viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="40" rx="4" fill="#e0e7ff" /> {/* Example background */}
        <text x="50" y="25" fontFamily="Arial, sans-serif" fontSize="12" fill="#4f46e5" textAnchor="middle" fontWeight="bold">ScanPlate</text> {/* Example text */}
    </svg>
);

export default CompanyLogoPlaceholder;
