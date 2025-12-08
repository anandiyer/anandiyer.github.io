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
        description: "Open AGI through decentralized infrastructure",
        website: "https://sentient.foundation",
        logo: "https://pbs.twimg.com/profile_images/1966252290500710400/iacpKDQc_400x400.jpg",
        order: 9
    },
    {
        id: 10,
        name: "Rain",
        description: "Stablecoin powered finance",
        website: "https://rain.xyz",
        logo: "https://pbs.twimg.com/profile_images/1977841389653086208/5JABD8CK_400x400.jpg",
        order: 10
    }, 
    {
        id: 11,
        name: "Mesta",
        description: "Money movement network",
        website: "https://mesta.xyz",
        logo: "https://pbs.twimg.com/profile_images/1823757102625562624/XHTihpRU_400x400.jpg",
        order: 11
    }, 
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

// Create Substack post card HTML
function createSubstackCard(post) {
    const safeTitle = post.title || "";
    const safeExcerpt = post.excerpt || "";
    const safeTag = post.tag || "Essay";
    const safeDate = post.date || "";
    const safeReadTime = post.readTime || "";

    return `
        <article class="substack-card" onclick="openSubstackPost('${post.url}')">
            <div>
                <div class="substack-tag">${safeTag}</div>
                <h3 class="substack-post-title font-aeonik">
                    ${safeTitle}
                </h3>
                <div class="substack-post-meta font-aeonik">
                    ${safeDate}${safeDate && safeReadTime ? " • " : ""}${safeReadTime}
                </div>
                <p class="substack-post-excerpt font-aeonik">
                    ${safeExcerpt}
                </p>
            </div>
            <div class="substack-post-cta font-aeonik">
                <span>Read on Substack</span>
                <span>&rarr;</span>
            </div>
        </article>
    `;
}

// Open Substack post in a new tab
function openSubstackPost(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

async function loadSubstackPosts() {
    const rssUrl = "https://canonicalcrypto.substack.com/feed";

    try {
        // Use a public RSS-to-JSON proxy because RSS XML can't be fetched directly
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.items || data.items.length === 0) return;

        const latestPosts = data.items.slice(0, 4); // show latest 4

        const container = document.getElementById("substack-posts-container");
        container.innerHTML = latestPosts.map(post => {
            const title = post.title;
            const url = post.link;
            const date = new Date(post.pubDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });

            // Extract excerpt — Substack provides HTML content
            const excerpt = post.description
                .replace(/<[^>]+>/g, "")       // strip HTML tags
                .split(". ")[0] + ".";         // first sentence only

            return `
                <article class="substack-card" onclick="openSubstackPost('${url}')">
                    <div>
                        <div class="substack-tag">Essay</div>

                        <h3 class="substack-post-title font-aeonik">
                            ${title}
                        </h3>

                        <div class="substack-post-meta font-aeonik">
                            ${date}
                        </div>

                        <p class="substack-post-excerpt font-aeonik">
                            ${excerpt}
                        </p>
                    </div>

                    <div class="substack-post-cta font-aeonik">
                        <span>Read on Substack</span>
                        <span>&rarr;</span>
                    </div>
                </article>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading Substack feed:", err);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load portfolio companies
    loadPortfolioCompanies();

    loadSubstackPosts();
    
    // Add scroll event listener for header
    window.addEventListener('scroll', handleHeaderScroll);
    
    // Initial header state
    handleHeaderScroll();
});

// Make functions globally available
window.scrollToSection = scrollToSection;
window.openCompanyWebsite = openCompanyWebsite;
window.handleImageError = handleImageError;
window.openSubstackPost = openSubstackPost;
