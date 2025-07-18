// Handles UI related functionalities like dark/light mode, smooth scroll, scroll-to-top

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dark/Light Mode Toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    // On page load or when changing themes, best to add inline to avoid FOUC
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        if (moonIcon) moonIcon.classList.remove('hidden');
        if (sunIcon) sunIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if (moonIcon) moonIcon.classList.add('hidden');
        if (sunIcon) sunIcon.classList.remove('hidden');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
                if (moonIcon) moonIcon.classList.add('hidden');
                if (sunIcon) sunIcon.classList.remove('hidden');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
                if (moonIcon) moonIcon.classList.remove('hidden');
                if (sunIcon) sunIcon.classList.add('hidden');
            }
        });
    }

    // 2. Smooth Scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 3. Scroll-to-top Button
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    if (scrollToTopBtn) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) { // Show after scrolling 300px
                scrollToTopBtn.classList.add('show', 'scale-100', 'opacity-100');
                scrollToTopBtn.classList.remove('scale-0', 'opacity-0');
            } else {
                scrollToTopBtn.classList.remove('show', 'scale-100', 'opacity-100');
                scrollToTopBtn.classList.add('scale-0', 'opacity-0');
            }
        });

        // Scroll to top on click
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

// Helper function to create tool cards (reusable for featured and all tools)
export function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card fade-in'; // Add fade-in for smooth appearance
    card.innerHTML = `
        <div class="tool-card-image-container">
            <img src="${tool.imageURL || '/assets/logo.png'}" alt="${tool.title}" loading="lazy">
        </div>
        <div class="tool-card-content">
            <h3 class="tool-card-title">${tool.title}</h3>
            <p class="tool-card-description">${tool.description}</p>
            <div class="tool-card-tags">
                ${tool.tags ? tool.tags.map(tag => `<span class="tool-card-tag">${tag}</span>`).join('') : ''}
            </div>
            <a href="${tool.externalLink}" target="_blank" rel="noopener noreferrer" class="tool-card-link">Visit Tool</a>
        </div>
    `;
    return card;
}

// Helper function to create blog post cards
export function createBlogPostCard(post) {
    const card = document.createElement('div');
    card.className = 'blog-card fade-in'; // Add fade-in for smooth appearance
    card.innerHTML = `
        <div class="blog-card-image-container">
            <img src="${post.coverImageURL || '/assets/blog-placeholder.jpg'}" alt="${post.title}" loading="lazy">
        </div>
        <div class="blog-card-content">
            <h3 class="blog-card-title">${post.title}</h3>
            <p class="blog-card-date">${new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p class="blog-card-description">${post.body.substring(0, 100)}...</p>
            <a href="/public/blog-single.html?id=${post.id}" class="blog-card-link">Read More</a>
        </div>
    `;
    return card;
}

// Helper function for showing alerts/messages
export function showAlert(message, type = 'info', containerId = 'newsletter-message') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let bgColorClass = '';
    let textColorClass = '';

    switch (type) {
        case 'success':
            bgColorClass = 'bg-green-100 dark:bg-green-800';
            textColorClass = 'text-green-800 dark:text-green-200';
            break;
        case 'error':
            bgColorClass = 'bg-red-100 dark:bg-red-800';
            textColorClass = 'text-red-800 dark:text-red-200';
            break;
        case 'warning':
            bgColorClass = 'bg-yellow-100 dark:bg-yellow-800';
            textColorClass = 'text-yellow-800 dark:text-yellow-200';
            break;
        case 'info':
        default:
            bgColorClass = 'bg-blue-100 dark:bg-blue-800';
            textColorClass = 'text-blue-800 dark:text-blue-200';
            break;
    }

    container.innerHTML = `<div class="p-3 mt-4 rounded-md ${bgColorClass} ${textColorClass}">${message}</div>`;
    // Optionally, clear the message after a few seconds
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}
