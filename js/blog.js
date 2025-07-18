import { db } from './firebase-config.js';
import { createBlogPostCard } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const blogPostsContainer = document.getElementById('blog-posts-container');
    const loadingBlogPosts = document.getElementById('loading-blog-posts');

    // Function to fetch and display latest blog posts
    async function fetchLatestBlogPosts() {
        if (!blogPostsContainer) return;
        try {
            // Order by publishDate descending and limit to 3 for preview
            const snapshot = await db.collection('blogs')
                                     .orderBy('publishDate', 'desc')
                                     .limit(3)
                                     .get();

            if (loadingBlogPosts) loadingBlogPosts.remove();
            if (snapshot.empty) {
                blogPostsContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 col-span-full">No blog posts available yet. Check back soon!</p>';
                return;
            }

            snapshot.forEach(doc => {
                blogPostsContainer.appendChild(createBlogPostCard({ ...doc.data(), id: doc.id }));
            });
        } catch (error) {
            console.error("Error fetching latest blog posts:", error);
            if (loadingBlogPosts) loadingBlogPosts.textContent = 'Failed to load blog posts.';
        }
    }

    // Call the function to fetch and display blog posts
    fetchLatestBlogPosts();
});
