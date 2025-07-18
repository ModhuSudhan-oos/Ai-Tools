import { db } from './firebase-config.js';
import { createToolCard } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const featuredToolsContainer = document.getElementById('featured-tools-container');
    const allToolsGrid = document.getElementById('tools-grid');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const loadingFeaturedTools = document.getElementById('loading-featured-tools');
    const loadingAllTools = document.getElementById('loading-all-tools');
    const loadingUpcomingTools = document.getElementById('loading-upcoming-tools');
    const upcomingToolsContainer = document.getElementById('upcoming-tools-container');

    let allToolsData = []; // Store all tools to facilitate filtering

    // Function to fetch and display featured tools
    async function fetchFeaturedTools() {
        if (!featuredToolsContainer) return;
        try {
            const snapshot = await db.collection('tools').where('featured', '==', true).limit(3).get();
            if (loadingFeaturedTools) loadingFeaturedTools.remove();
            if (snapshot.empty) {
                featuredToolsContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 col-span-full">No featured tools available yet.</p>';
                return;
            }
            snapshot.forEach(doc => {
                featuredToolsContainer.appendChild(createToolCard({ ...doc.data(), id: doc.id }));
            });
        } catch (error) {
            console.error("Error fetching featured tools:", error);
            if (loadingFeaturedTools) loadingFeaturedTools.textContent = 'Failed to load featured tools.';
        }
    }

    // Function to fetch and display all tools with categories
    async function fetchAllTools() {
        if (!allToolsGrid) return;
        try {
            const snapshot = await db.collection('tools').get();
            if (loadingAllTools) loadingAllTools.remove();
            if (snapshot.empty) {
                allToolsGrid.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 col-span-full">No tools available yet.</p>';
                return;
            }

            allToolsData = [];
            const categories = new Set();

            snapshot.forEach(doc => {
                const tool = { ...doc.data(), id: doc.id };
                allToolsData.push(tool);
                if (tool.category) {
                    categories.add(tool.category);
                }
            });

            renderTools(allToolsData);
            renderCategories(Array.from(categories));

        } catch (error) {
            console.error("Error fetching all tools:", error);
            if (loadingAllTools) loadingAllTools.textContent = 'Failed to load tools.';
        }
    }

    // Function to render tools into the grid
    function renderTools(toolsToRender) {
        if (!allToolsGrid) return;
        allToolsGrid.innerHTML = ''; // Clear existing tools
        if (toolsToRender.length === 0) {
            allToolsGrid.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 col-span-full">No tools found for this category.</p>';
            return;
        }
        toolsToRender.forEach(tool => {
            allToolsGrid.appendChild(createToolCard(tool));
        });
    }

    // Function to render category filter buttons
    function renderCategories(categories) {
        if (!categoryFiltersContainer) return;
        // Keep "All" button, clear others
        categoryFiltersContainer.querySelectorAll('button:not([data-category="all"])').forEach(btn => btn.remove());

        categories.sort().forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-full hover:bg-blue-500 hover:text-white transition duration-200 text-sm md:text-base';
            button.textContent = category;
            button.dataset.category = category;
            categoryFiltersContainer.appendChild(button);
        });

        // Add event listener for category filtering
        categoryFiltersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                const selectedCategory = e.target.dataset.category;
                const filteredTools = selectedCategory === 'all' ? allToolsData : allToolsData.filter(tool => tool.category === selectedCategory);
                renderTools(filteredTools);

                // Update active button style
                categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                    btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                });
                e.target.classList.add('bg-blue-500', 'text-white');
                e.target.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
            }
        });
    }

    // Function to fetch and display upcoming tools
    async function fetchUpcomingTools() {
        if (!upcomingToolsContainer) return;
        try {
            const snapshot = await db.collection('tools').where('status', '==', 'coming-soon').limit(4).get();
            if (loadingUpcomingTools) loadingUpcomingTools.remove();
            if (snapshot.empty) {
                upcomingToolsContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 col-span-full">No upcoming tools announced yet. Check back soon!</p>';
                return;
            }
            snapshot.forEach(doc => {
                const tool = doc.data();
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center fade-in';
                card.innerHTML = `
                    <h4 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${tool.title}</h4>
                    <p class="text-gray-600 dark:text-gray-300 text-sm">${tool.description.substring(0, 80)}...</p>
                    <span class="inline-block bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2.5 py-0.5 rounded-full mt-3">Coming Soon</span>
                `;
                upcomingToolsContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error fetching upcoming tools:", error);
            if (loadingUpcomingTools) loadingUpcomingTools.textContent = 'Failed to load upcoming tools.';
        }
    }


    // Initialize fetches on page load
    fetchFeaturedTools();
    fetchAllTools();
    fetchUpcomingTools();
});
