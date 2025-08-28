// Portfolio companies data
const portfolioCompanies = [
    {
        id: 1,
        name: "Gensyn",
        description: "Decentralized compute network for Machine Learning",
        website: "https://www.gensyn.ai",
        logo: "https://cdn.prod.website-files.com/66bc6da8fe284e4693088ff7/66bc6da8fe284e4693088ffe_Gensyn-Symbol.svg",
        order: 1
    },
    {
        id: 2,
        name: "Ritual",
        description: "The AI Coprocessor for blockchains",
        website: "https://ritual.net",
        logo: "https://pbs.twimg.com/profile_images/1912582510631858176/-Xbw2AcT_400x400.jpg",
        order: 2
    },
    {
        id: 3,
        name: "Sahara",
        description: "Decentralized AI Data Network",
        website: "https://saharalabs.ai",
        logo: "https://pbs.twimg.com/profile_images/1955663161928921088/nn_g5zL1_400x400.png",
        order: 3
    },
    {
        id: 4,
        name: "Virtuals",
        description: "AI agent protocol",
        website: "https://virtuals.io",
        logo: "https://virtuals.io/favicon.ico",
        order: 4
    },
    {
        id: 5,
        name: "Exo Labs",
        description: "Distributed inference for AI models",
        website: "https://exolabs.net",
        logo: "https://exolabs.net/favicon.ico",
        order: 5
    },
    {
        id: 6,
        name: "OpenGradient",
        description: "Building verifiable and sovereign AI",
        website: "https://www.opengradient.ai",
        logo: "https://pbs.twimg.com/profile_images/1902830433466978305/9V0NUEPt_400x400.jpg",
        order: 6
    },
    {
        id: 7,
        name: "Tensorplex",
        description: "AI infrastructure for decentralized computing",
        website: "http://tensorplex.ai",
        logo: "http://tensorplex.ai/favicon.ico",
        order: 7
    },
    {
        id: 8,
        name: "Synthefy",
        description: "Foundational model for time series",
        website: "https://www.synthefy.com",
        logo: "https://www.synthefy.com/favicon.ico",
        order: 8
    },
    {
        id: 9,
        name: "Sentient",
        description: "Open AGI for everyone through decentralized infrastructure",
        website: "https://sentient.foundation",
        logo: "https://pbs.twimg.com/profile_images/1812420751829422080/QV-SLzAa_400x400.jpg",
        order: 9
    }
];

// Smooth scrolling function
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const offset = 80; // Header height
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
}

// Header scroll effect
function handleHeaderScroll() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Create portfolio card HTML
function createPortfolioCard(company) {
    const cleanWebsite = company.website 
        ? company.website.replace('https://', '').replace('http://', '')
        : '';

    return `
        <div class="portfolio-card flex-shrink-0" onclick="openCompanyWebsite('${company.website}')">
            <div class="portfolio-header">
                <div class="logo-container">
                    <img 
                        src="${company.logo || ''}" 
                        alt="${company.name} logo"
                        class="logo-image"
                        onerror="handleImageError(this, '${company.name}')"
                    />
                </div>
            </div>
            
            <h3 class="company-name font-aeonik">
                ${company.name}
            </h3>
            <p class="company-description font-aeonik">
                ${company.description}
            </p>
            ${company.website ? `
                <span class="company-website font-aeonik">
                    ${cleanWebsite}
                </span>
            ` : ''}
        </div>
    `;
}

// Handle image loading errors
function handleImageError(img, companyName) {
    img.style.display = 'none';
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #1e3a8a; color: white; font-size: 1rem; font-weight: bold; border-radius: 0.25rem;';
    fallbackDiv.textContent = companyName.charAt(0);
    img.parentNode.appendChild(fallbackDiv);
}

// Open company website
function openCompanyWebsite(website) {
    if (website) {
        window.open(website, '_blank');
    }
}

// Load portfolio companies
function loadPortfolioCompanies() {
    const portfolioContainer = document.querySelector('.portfolio-carousel .flex');
    if (portfolioContainer) {
        // Sort companies by order
        const sortedCompanies = portfolioCompanies.sort((a, b) => a.order - b.order);
        
        // Generate HTML for all companies
        const portfolioHTML = sortedCompanies.map(company => createPortfolioCard(company)).join('');
        
        // Insert into container
        portfolioContainer.innerHTML = portfolioHTML;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load portfolio companies
    loadPortfolioCompanies();
    
    // Add scroll event listener for header
    window.addEventListener('scroll', handleHeaderScroll);
    
    // Initial header state
    handleHeaderScroll();
});

// Make functions globally available
window.scrollToSection = scrollToSection;
window.openCompanyWebsite = openCompanyWebsite;
window.handleImageError = handleImageError;
