import { db, storage, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js';

// --- Authentication Check ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // User is not signed in, redirect to login page
        window.location.href = '/public/login.html';
    } else {
        // User is signed in, display email and enable logout
        document.getElementById('admin-user-email').textContent = user.email;
        document.getElementById('admin-logout-btn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = '/public/login.html';
            } catch (error) {
                console.error("Error logging out:", error);
                alert("Failed to log out.");
            }
        });
        // Initialize admin functions after successful login
        initializeAdminDashboard();
    }
});

// --- Dashboard Initialization ---
async function initializeAdminDashboard() {
    console.log("Admin Dashboard Initializing...");

    // Set current year in footer
    document.getElementById('current-year-admin').textContent = new Date().getFullYear();

    // Populate dashboard overview counts
    await updateDashboardCounts();

    // Manage AI Tools
    await loadTools();
    setupToolForm();

    // Manage Categories
    await loadCategories();
    setupCategoryManagement();

    // Manage Blog Posts
    await loadBlogPosts();
    setupBlogForm();
    initializeTinyMCE(); // Initialize TinyMCE for blog content

    // Manage Submissions
    await loadToolSubmissions();
    await loadContactSubmissions();

    // Site Settings
    await loadSocialLinks();
    setupSocialLinksForm();

    // Smooth scroll for sidebar navigation
    document.querySelectorAll('aside nav ul li a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });

            // Update active class
            document.querySelectorAll('aside nav ul li a').forEach(item => {
                item.classList.remove('text-blue-600', 'dark:text-blue-400', 'font-semibold', 'bg-blue-50', 'dark:bg-gray-700');
                item.classList.add('text-gray-700', 'dark:text-gray-300');
            });
            this.classList.add('text-blue-600', 'dark:text-blue-400', 'font-semibold', 'bg-blue-50', 'dark:bg-gray-700');
            this.classList.remove('text-gray-700', 'dark:text-gray-300');
        });
    });

    // Set initial active link
    document.querySelector('aside nav ul li a[href="#dashboard-overview"]').classList.add('text-blue-600', 'dark:text-blue-400', 'font-semibold', 'bg-blue-50', 'dark:bg-gray-700');
    document.querySelector('aside nav ul li a[href="#dashboard-overview"]').classList.remove('text-gray-700', 'dark:text-gray-300');
}

// --- Dashboard Overview ---
async function updateDashboardCounts() {
    try {
        const toolsSnapshot = await getDocs(collection(db, 'aiTools'));
        document.getElementById('total-tools-count').textContent = toolsSnapshot.size;

        const blogsSnapshot = await getDocs(collection(db, 'blogPosts'));
        document.getElementById('total-blogs-count').textContent = blogsSnapshot.size;

        const toolSubmissionsSnapshot = await getDocs(collection(db, 'toolSubmissions'));
        const contactSubmissionsSnapshot = await getDocs(collection(db, 'contactSubmissions'));
        document.getElementById('pending-submissions-count').textContent = toolSubmissionsSnapshot.size + contactSubmissionsSnapshot.size;

    } catch (error) {
        console.error("Error updating dashboard counts:", error);
    }
}

// --- Manage AI Tools ---
const toolFormContainer = document.getElementById('tool-form-container');
const addToolBtn = document.getElementById('add-tool-btn');
const aiToolForm = document.getElementById('ai-tool-form');
const toolIdInput = document.getElementById('tool-id');
const toolNameInput = document.getElementById('tool-name');
const toolDescriptionInput = document.getElementById('tool-description');
const toolUrlInput = document.getElementById('tool-url');
const toolCategorySelect = document.getElementById('tool-category');
const toolFeaturesInput = document.getElementById('tool-features');
const toolPricingSelect = document.getElementById('tool-pricing');
const toolImageInput = document.getElementById('tool-image');
const currentToolImagePreview = document.getElementById('current-tool-image-preview');
const toolFeaturedCheckbox = document.getElementById('tool-featured');
const toolFormMessage = document.getElementById('tool-form-message');
const toolsListTableBody = document.getElementById('tools-list');

let currentToolImageUrl = '';

function setupToolForm() {
    addToolBtn.addEventListener('click', () => {
        resetToolForm();
        toolFormContainer.classList.remove('hidden');
        document.getElementById('tool-form-title').textContent = 'Add New AI Tool';
    });

    document.getElementById('cancel-tool-edit').addEventListener('click', () => {
        toolFormContainer.classList.add('hidden');
        resetToolForm();
    });

    aiToolForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = toolIdInput.value;
        const name = toolNameInput.value;
        const description = toolDescriptionInput.value;
        const url = toolUrlInput.value;
        const categories = Array.from(toolCategorySelect.selectedOptions).map(option => option.value);
        const features = toolFeaturesInput.value.split(',').map(f => f.trim()).filter(f => f);
        const pricing = toolPricingSelect.value;
        const imageFile = toolImageInput.files[0];
        const isFeatured = toolFeaturedCheckbox.checked;

        toolFormMessage.textContent = 'Saving...';
        toolFormMessage.className = 'text-sm text-center text-blue-600 dark:text-blue-400';

        let imageUrl = currentToolImageUrl;

        try {
            if (imageFile) {
                // Delete old image if it exists and is different from the new one
                if (currentToolImageUrl && !currentToolImageUrl.includes(imageFile.name)) {
                    const oldImageRef = ref(storage, currentToolImageUrl);
                    await deleteObject(oldImageRef).catch(err => console.warn("Could not delete old image:", err.message));
                }
                const imageRef = ref(storage, `tool_images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);
            } else if (!currentToolImageUrl && id) { // If editing an existing tool and no new image, but current image was removed
                 // This case should ideally be handled by a specific "remove image" button
                 // For now, if currentToolImageUrl is empty and no new file, it means no image.
            }

            const toolData = {
                name,
                description,
                url,
                categories,
                features,
                pricing,
                imageUrl,
                isFeatured,
                updatedAt: new Date()
            };

            if (id) {
                // Update existing tool
                await updateDoc(doc(db, 'aiTools', id), toolData);
                toolFormMessage.textContent = 'Tool updated successfully!';
                toolFormMessage.className = 'text-sm text-center text-green-600 dark:text-green-400';
            } else {
                // Add new tool
                toolData.createdAt = new Date();
                await addDoc(collection(db, 'aiTools'), toolData);
                toolFormMessage.textContent = 'Tool added successfully!';
                toolFormMessage.className = 'text-sm text-center text-green-600 dark:text-green-400';
            }

            resetToolForm();
            toolFormContainer.classList.add('hidden');
            await loadTools();
            await updateDashboardCounts(); // Update dashboard count
        } catch (error) {
            console.error("Error saving tool:", error);
            toolFormMessage.textContent = `Error: ${error.message}`;
            toolFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
        }
    });
}

async function loadTools() {
    toolsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading tools...</td></tr>';
    try {
        const q = query(collection(db, 'aiTools'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        toolsListTableBody.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            toolsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">No AI tools added yet.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const tool = { id: doc.id, ...doc.data() };
            const row = toolsListTableBody.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="py-3 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">${tool.name}</td>
                <td class="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">${tool.categories.join(', ')}</td>
                <td class="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">${tool.pricing}</td>
                <td class="py-3 px-4 whitespace-nowrap">
                    <button data-id="${tool.id}" class="edit-tool-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm mr-2 transition duration-300">Edit</button>
                    <button data-id="${tool.id}" data-image-url="${tool.imageUrl || ''}" class="delete-tool-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-300">Delete</button>
                </td>
            `;
        });

        document.querySelectorAll('.edit-tool-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await editTool(id);
            });
        });

        document.querySelectorAll('.delete-tool-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const imageUrl = e.target.dataset.imageUrl;
                if (confirm('Are you sure you want to delete this tool?')) {
                    await deleteTool(id, imageUrl);
                }
            });
        });

        // Re-populate categories dropdown for tools
        await populateToolCategoriesDropdown();

    } catch (error) {
        console.error("Error loading tools:", error);
        toolsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500 dark:text-red-400">Error loading tools.</td></tr>';
    }
}

async function editTool(id) {
    toolFormMessage.textContent = 'Loading tool for editing...';
    toolFormMessage.className = 'text-sm text-center text-blue-600 dark:text-blue-400';
    try {
        const toolDoc = await db.collection('aiTools').doc(id).get();
        if (toolDoc.exists) {
            const tool = toolDoc.data();
            toolIdInput.value = id;
            toolNameInput.value = tool.name;
            toolDescriptionInput.value = tool.description;
            toolUrlInput.value = tool.url;

            // Select categories
            Array.from(toolCategorySelect.options).forEach(option => {
                option.selected = tool.categories.includes(option.value);
            });

            toolFeaturesInput.value = tool.features.join(', ');
            toolPricingSelect.value = tool.pricing;
            toolFeaturedCheckbox.checked = tool.isFeatured || false;

            currentToolImageUrl = tool.imageUrl || '';
            if (currentToolImageUrl) {
                currentToolImagePreview.src = currentToolImageUrl;
                currentToolImagePreview.classList.remove('hidden');
            } else {
                currentToolImagePreview.classList.add('hidden');
            }

            document.getElementById('tool-form-title').textContent = 'Edit AI Tool';
            toolFormContainer.classList.remove('hidden');
            toolFormMessage.textContent = ''; // Clear loading message
        } else {
            toolFormMessage.textContent = 'Tool not found.';
            toolFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
        }
    } catch (error) {
        console.error("Error fetching tool for edit:", error);
        toolFormMessage.textContent = `Error loading tool: ${error.message}`;
        toolFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
    }
}

async function deleteTool(id, imageUrl) {
    try {
        if (imageUrl) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(err => console.warn("Could not delete associated image:", err.message));
        }
        await deleteDoc(doc(db, 'aiTools', id));
        alert('Tool deleted successfully!');
        await loadTools();
        await updateDashboardCounts(); // Update dashboard count
    } catch (error) {
        console.error("Error deleting tool:", error);
        alert(`Failed to delete tool: ${error.message}`);
    }
}

function resetToolForm() {
    aiToolForm.reset();
    toolIdInput.value = '';
    currentToolImageUrl = '';
    currentToolImagePreview.classList.add('hidden');
    currentToolImagePreview.src = '';
    toolFormMessage.textContent = '';
    toolFormMessage.className = 'text-sm text-center';
    toolImageInput.value = ''; // Clear selected file
    toolFeaturedCheckbox.checked = false; // Reset checkbox
    Array.from(toolCategorySelect.options).forEach(option => option.selected = false); // Deselect all categories
}


// --- Manage Categories ---
const categoryNameInput = document.getElementById('category-name');
const addCategoryBtn = document.getElementById('add-category-btn');
const categoriesListTableBody = document.getElementById('categories-list');
const categoryFormMessage = document.getElementById('category-form-message');

function setupCategoryManagement() {
    addCategoryBtn.addEventListener('click', async () => {
        const categoryName = categoryNameInput.value.trim();
        if (!categoryName) {
            categoryFormMessage.textContent = 'Category name cannot be empty.';
            categoryFormMessage.className = 'text-sm text-red-600 dark:text-red-400 mb-4';
            return;
        }

        categoryFormMessage.textContent = 'Adding category...';
        categoryFormMessage.className = 'text-sm text-blue-600 dark:text-blue-400 mb-4';

        try {
            // Check if category already exists (case-insensitive)
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            const exists = categoriesSnapshot.docs.some(doc => doc.data().name.toLowerCase() === categoryName.toLowerCase());

            if (exists) {
                categoryFormMessage.textContent = 'Category already exists.';
                categoryFormMessage.className = 'text-sm text-red-600 dark:text-red-400 mb-4';
                return;
            }

            await addDoc(collection(db, 'categories'), {
                name: categoryName,
                createdAt: new Date()
            });
            categoryFormMessage.textContent = 'Category added successfully!';
            categoryFormMessage.className = 'text-sm text-green-600 dark:text-green-400 mb-4';
            categoryNameInput.value = '';
            await loadCategories();
            await populateToolCategoriesDropdown(); // Update tool category dropdown
        } catch (error) {
            console.error("Error adding category:", error);
            categoryFormMessage.textContent = `Error: ${error.message}`;
            categoryFormMessage.className = 'text-sm text-red-600 dark:text-red-400 mb-4';
        }
    });
}

async function loadCategories() {
    categoriesListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading categories...</td></tr>';
    try {
        const q = query(collection(db, 'categories'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        categoriesListTableBody.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            categoriesListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500 dark:text-gray-400">No categories added yet.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const category = { id: doc.id, ...doc.data() };
            const row = categoriesListTableBody.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="py-3 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">${category.name}</td>
                <td class="py-3 px-4 whitespace-nowrap">
                    <button data-id="${category.id}" class="delete-category-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-300">Delete</button>
                </td>
            `;
        });

        document.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this category? This will not delete tools assigned to it, but they might appear uncategorized if no other categories are selected.')) {
                    await deleteCategory(id);
                }
            });
        });
    } catch (error) {
        console.error("Error loading categories:", error);
        categoriesListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-red-500 dark:text-red-400">Error loading categories.</td></tr>';
    }
}

async function deleteCategory(id) {
    try {
        await deleteDoc(doc(db, 'categories', id));
        alert('Category deleted successfully!');
        await loadCategories();
        await populateToolCategoriesDropdown(); // Update tool category dropdown
    } catch (error) {
        console.error("Error deleting category:", error);
        alert(`Failed to delete category: ${error.message}`);
    }
}

async function populateToolCategoriesDropdown() {
    toolCategorySelect.innerHTML = ''; // Clear existing options
    try {
        const q = query(collection(db, 'categories'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = category.name; // Store category name as value
            option.textContent = category.name;
            toolCategorySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating categories dropdown:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Error loading categories';
        toolCategorySelect.appendChild(option);
    }
}


// --- Manage Blog Posts ---
const blogFormContainer = document.getElementById('blog-form-container');
const addBlogBtn = document.getElementById('add-blog-btn');
const blogPostForm = document.getElementById('blog-post-form');
const blogIdInput = document.getElementById('blog-id');
const blogTitleInput = document.getElementById('blog-title');
const blogAuthorInput = document.getElementById('blog-author');
const blogBodyTextarea = document.getElementById('blog-body');
const blogTagsInput = document.getElementById('blog-tags');
const blogImageInput = document.getElementById('blog-image');
const currentBlogImagePreview = document.getElementById('current-blog-image-preview');
const blogFormMessage = document.getElementById('blog-form-message');
const blogPostsListTableBody = document.getElementById('blog-posts-list');

let currentBlogImageUrl = '';
let tinyMCEEditor; // To hold the TinyMCE instance

function initializeTinyMCE() {
    tinymce.init({
        selector: '#blog-body',
        plugins: 'advlist autolink lists link image charmap print preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste code help wordcount',
        toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        height: 400,
        init_instance_callback: function (editor) {
            tinyMCEEditor = editor;
            console.log("TinyMCE initialized for #blog-body");
        }
    });
}

function setupBlogForm() {
    addBlogBtn.addEventListener('click', () => {
        resetBlogForm();
        blogFormContainer.classList.remove('hidden');
        document.getElementById('blog-form-title').textContent = 'Add New Blog Post';
    });

    document.getElementById('cancel-blog-edit').addEventListener('click', () => {
        blogFormContainer.classList.add('hidden');
        resetBlogForm();
    });

    blogPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = blogIdInput.value;
        const title = blogTitleInput.value;
        const author = blogAuthorInput.value;
        const content = tinyMCEEditor ? tinyMCEEditor.getContent() : blogBodyTextarea.value; // Get content from TinyMCE if active
        const tags = blogTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const imageFile = blogImageInput.files[0];

        blogFormMessage.textContent = 'Saving blog post...';
        blogFormMessage.className = 'text-sm text-center text-blue-600 dark:text-blue-400';

        let imageUrl = currentBlogImageUrl;

        try {
            if (imageFile) {
                // Delete old image if it exists and is different from the new one
                if (currentBlogImageUrl && !currentBlogImageUrl.includes(imageFile.name)) {
                    const oldImageRef = ref(storage, currentBlogImageUrl);
                    await deleteObject(oldImageRef).catch(err => console.warn("Could not delete old blog image:", err.message));
                }
                const imageRef = ref(storage, `blog_images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);
            }

            const blogData = {
                title,
                author,
                content,
                tags,
                imageUrl,
                updatedAt: new Date()
            };

            if (id) {
                // Update existing blog post
                await updateDoc(doc(db, 'blogPosts', id), blogData);
                blogFormMessage.textContent = 'Blog post updated successfully!';
                blogFormMessage.className = 'text-sm text-center text-green-600 dark:text-green-400';
            } else {
                // Add new blog post
                blogData.createdAt = new Date();
                await addDoc(collection(db, 'blogPosts'), blogData);
                blogFormMessage.textContent = 'Blog post added successfully!';
                blogFormMessage.className = 'text-sm text-center text-green-600 dark:text-green-400';
            }

            resetBlogForm();
            blogFormContainer.classList.add('hidden');
            await loadBlogPosts();
            await updateDashboardCounts(); // Update dashboard count
        } catch (error) {
            console.error("Error saving blog post:", error);
            blogFormMessage.textContent = `Error: ${error.message}`;
            blogFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
        }
    });
}

async function loadBlogPosts() {
    blogPostsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading blog posts...</td></tr>';
    try {
        const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        blogPostsListTableBody.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            blogPostsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">No blog posts added yet.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const blog = { id: doc.id, ...doc.data() };
            const publishDate = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const row = blogPostsListTableBody.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="py-3 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">${blog.title}</td>
                <td class="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">${blog.author}</td>
                <td class="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">${publishDate}</td>
                <td class="py-3 px-4 whitespace-nowrap">
                    <button data-id="${blog.id}" class="edit-blog-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm mr-2 transition duration-300">Edit</button>
                    <button data-id="${blog.id}" data-image-url="${blog.imageUrl || ''}" class="delete-blog-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-300">Delete</button>
                </td>
            `;
        });

        document.querySelectorAll('.edit-blog-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await editBlog(id);
            });
        });

        document.querySelectorAll('.delete-blog-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const imageUrl = e.target.dataset.imageUrl;
                if (confirm('Are you sure you want to delete this blog post?')) {
                    await deleteBlog(id, imageUrl);
                }
            });
        });

    } catch (error) {
        console.error("Error loading blog posts:", error);
        blogPostsListTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500 dark:text-red-400">Error loading blog posts.</td></tr>';
    }
}

async function editBlog(id) {
    blogFormMessage.textContent = 'Loading blog post for editing...';
    blogFormMessage.className = 'text-sm text-center text-blue-600 dark:text-blue-400';
    try {
        const blogDoc = await db.collection('blogPosts').doc(id).get();
        if (blogDoc.exists) {
            const blog = blogDoc.data();
            blogIdInput.value = id;
            blogTitleInput.value = blog.title;
            blogAuthorInput.value = blog.author;
            // Set TinyMCE content if initialized, otherwise textarea
            if (tinyMCEEditor) {
                tinyMCEEditor.setContent(blog.content || '');
            } else {
                blogBodyTextarea.value = blog.content || '';
            }
            blogTagsInput.value = blog.tags ? blog.tags.join(', ') : '';

            currentBlogImageUrl = blog.imageUrl || '';
            if (currentBlogImageUrl) {
                currentBlogImagePreview.src = currentBlogImageUrl;
                currentBlogImagePreview.classList.remove('hidden');
            } else {
                currentBlogImagePreview.classList.add('hidden');
            }

            document.getElementById('blog-form-title').textContent = 'Edit Blog Post';
            blogFormContainer.classList.remove('hidden');
            blogFormMessage.textContent = ''; // Clear loading message
        } else {
            blogFormMessage.textContent = 'Blog post not found.';
            blogFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
        }
    } catch (error) {
        console.error("Error fetching blog post for edit:", error);
        blogFormMessage.textContent = `Error loading blog post: ${error.message}`;
        blogFormMessage.className = 'text-sm text-center text-red-600 dark:text-red-400';
    }
}

async function deleteBlog(id, imageUrl) {
    try {
        if (imageUrl) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(err => console.warn("Could not delete associated image:", err.message));
        }
        await deleteDoc(doc(db, 'blogPosts', id));
        alert('Blog post deleted successfully!');
        await loadBlogPosts();
        await updateDashboardCounts(); // Update dashboard count
    } catch (error) {
        console.error("Error deleting blog post:", error);
        alert(`Failed to delete blog post: ${error.message}`);
    }
}

function resetBlogForm() {
    blogPostForm.reset();
    blogIdInput.value = '';
    // Clear TinyMCE content
    if (tinyMCEEditor) {
        tinyMCEEditor.setContent('');
    } else {
        blogBodyTextarea.value = '';
    }
    currentBlogImageUrl = '';
    currentBlogImagePreview.classList.add('hidden');
    currentBlogImagePreview.src = '';
    blogFormMessage.textContent = '';
    blogFormMessage.className = 'text-sm text-center';
    blogImageInput.value = ''; // Clear selected file
}


// --- Manage Submissions ---
const toolSubmissionsList = document.getElementById('tool-submissions-list');
const contactSubmissionsList = document.getElementById('contact-submissions-list');

async function loadToolSubmissions() {
    toolSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading tool submissions...</td></tr>';
    try {
        const q = query(collection(db, 'toolSubmissions'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        toolSubmissionsList.innerHTML = '';

        if (querySnapshot.empty) {
            toolSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">No tool submissions yet.</td></tr>';
            return;
        }

        querySnapshot.forEach(docSnapshot => {
            const submission = { id: docSnapshot.id, ...docSnapshot.data() };
            const submitDate = submission.timestamp ? new Date(submission.timestamp.toDate()).toLocaleString() : 'N/A';
            const row = toolSubmissionsList.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="py-3 px-4 text-gray-800 dark:text-gray-200 font-semibold">${submission.toolName || 'N/A'}</td>
                <td class="py-3 px-4 text-gray-700 dark:text-gray-300">${submission.yourName || 'Anonymous'} (${submission.yourEmail || 'N/A'})</td>
                <td class="py-3 px-4 text-gray-700 dark:text-gray-300">${submitDate}</td>
                <td class="py-3 px-4">
                    <button data-id="${submission.id}" class="view-tool-submission-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm mr-2 transition duration-300">View</button>
                    <button data-id="${submission.id}" class="delete-tool-submission-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-300">Delete</button>
                </td>
            `;
        });

        document.querySelectorAll('.view-tool-submission-btn').forEach(button => {
            button.addEventListener('click', (e) => viewToolSubmission(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-tool-submission-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteSubmission('toolSubmissions', e.target.dataset.id));
        });
    } catch (error) {
        console.error("Error loading tool submissions:", error);
        toolSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500 dark:text-red-400">Error loading tool submissions.</td></tr>';
    }
}

async function viewToolSubmission(id) {
    try {
        const submissionDoc = await db.collection('toolSubmissions').doc(id).get();
        if (submissionDoc.exists) {
            const submission = submissionDoc.data();
            let details = `
                <p><strong>Tool Name:</strong> ${submission.toolName || 'N/A'}</p>
                <p><strong>Description:</strong> ${submission.toolDescription || 'N/A'}</p>
                <p><strong>Website URL:</strong> <a href="${submission.toolUrl}" target="_blank" class="text-blue-600 hover:underline">${submission.toolUrl || 'N/A'}</a></p>
                <p><strong>Categories:</strong> ${submission.toolCategories ? submission.toolCategories.join(', ') : 'N/A'}</p>
                <p><strong>Pricing:</strong> ${submission.pricingModel || 'N/A'}</p>
                <p><strong>Submitted By:</strong> ${submission.yourName || 'Anonymous'}</p>
                <p><strong>Email:</strong> <a href="mailto:${submission.yourEmail}" class="text-blue-600 hover:underline">${submission.yourEmail || 'N/A'}</a></p>
                <p><strong>Date:</strong> ${submission.timestamp ? new Date(submission.timestamp.toDate()).toLocaleString() : 'N/A'}</p>
            `;
            alert(`Tool Submission Details:\n\n${details}`); // Using alert for simplicity, consider a modal for better UX
        } else {
            alert('Submission not found.');
        }
    } catch (error) {
        console.error("Error viewing tool submission:", error);
        alert(`Error viewing submission: ${error.message}`);
    }
}

async function loadContactSubmissions() {
    contactSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading contact messages...</td></tr>';
    try {
        const q = query(collection(db, 'contactSubmissions'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        contactSubmissionsList.innerHTML = '';

        if (querySnapshot.empty) {
            contactSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">No contact messages yet.</td></tr>';
            return;
        }

        querySnapshot.forEach(docSnapshot => {
            const submission = { id: docSnapshot.id, ...docSnapshot.data() };
            const submitDate = submission.timestamp ? new Date(submission.timestamp.toDate()).toLocaleString() : 'N/A';
            const row = contactSubmissionsList.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="py-3 px-4 text-gray-800 dark:text-gray-200 font-semibold">${submission.name || 'Anonymous'} (${submission.email || 'N/A'})</td>
                <td class="py-3 px-4 text-gray-700 dark:text-gray-300">${submission.subject || 'No Subject'}</td>
                <td class="py-3 px-4 text-gray-700 dark:text-gray-300">${submitDate}</td>
                <td class="py-3 px-4">
                    <button data-id="${submission.id}" class="view-contact-submission-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm mr-2 transition duration-300">View</button>
                    <button data-id="${submission.id}" class="delete-contact-submission-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-300">Delete</button>
                </td>
            `;
        });

        document.querySelectorAll('.view-contact-submission-btn').forEach(button => {
            button.addEventListener('click', (e) => viewContactSubmission(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-contact-submission-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteSubmission('contactSubmissions', e.target.dataset.id));
        });
    } catch (error) {
        console.error("Error loading contact submissions:", error);
        contactSubmissionsList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500 dark:text-red-400">Error loading contact messages.</td></tr>';
    }
}

async function viewContactSubmission(id) {
    try {
        const submissionDoc = await db.collection('contactSubmissions').doc(id).get();
        if (submissionDoc.exists) {
            const submission = submissionDoc.data();
            let details = `
                <p><strong>Name:</strong> ${submission.name || 'N/A'}</p>
                <p><strong>Email:</strong> <a href="mailto:${submission.email}" class="text-blue-600 hover:underline">${submission.email || 'N/A'}</a></p>
                <p><strong>Subject:</strong> ${submission.subject || 'N/A'}</p>
                <p><strong>Message:</strong></p><p>${submission.message || 'N/A'}</p>
                <p><strong>Date:</strong> ${submission.timestamp ? new Date(submission.timestamp.toDate()).toLocaleString() : 'N/A'}</p>
            `;
            alert(`Contact Message Details:\n\n${details}`); // Using alert for simplicity
        } else {
            alert('Message not found.');
        }
    } catch (error) {
        console.error("Error viewing contact submission:", error);
        alert(`Error viewing message: ${error.message}`);
    }
}

async function deleteSubmission(collectionName, id) {
    if (confirm(`Are you sure you want to delete this ${collectionName === 'toolSubmissions' ? 'tool submission' : 'contact message'}?`)) {
        try {
            await deleteDoc(doc(db, collectionName, id));
            alert('Submission deleted successfully!');
            if (collectionName === 'toolSubmissions') {
                await loadToolSubmissions();
            } else {
                await loadContactSubmissions();
            }
            await updateDashboardCounts(); // Update dashboard count
        } catch (error) {
            console.error(`Error deleting submission from ${collectionName}:`, error);
            alert(`Failed to delete submission: ${error.message}`);
        }
    }
}


// --- Site Settings ---
const socialLinksForm = document.getElementById('social-links-form');
const socialLinksMessage = document.getElementById('social-links-message');

async function loadSocialLinks() {
    try {
        const docSnapshot = await db.collection('settings').doc('socialLinks').get();
        if (docSnapshot.exists) {
            const data = docSnapshot.data();
            document.getElementById('social-facebook').value = data.facebook || '';
            document.getElementById('social-twitter').value = data.twitter || '';
            document.getElementById('social-linkedin').value = data.linkedin || '';
            document.getElementById('social-github').value = data.github || '';
            document.getElementById('social-youtube').value = data.youtube || '';
        }
    } catch (error) {
        console.error("Error loading social links:", error);
        socialLinksMessage.textContent = 'Error loading social links.';
        socialLinksMessage.className = 'text-sm text-red-600 dark:text-red-400 mt-2';
    }
}

function setupSocialLinksForm() {
    socialLinksForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        socialLinksMessage.textContent = 'Saving social links...';
        socialLinksMessage.className = 'text-sm text-blue-600 dark:text-blue-400 mt-2';

        const facebook = document.getElementById('social-facebook').value;
        const twitter = document.getElementById('social-twitter').value;
        const linkedin = document.getElementById('social-linkedin').value;
        const github = document.getElementById('social-github').value;
        const youtube = document.getElementById('social-youtube').value;

        try {
            await updateDoc(doc(db, 'settings', 'socialLinks'), {
                facebook: facebook || null,
                twitter: twitter || null,
                linkedin: linkedin || null,
                github: github || null,
                youtube: youtube || null,
                updatedAt: new Date()
            });
            socialLinksMessage.textContent = 'Social links saved successfully!';
            socialLinksMessage.className = 'text-sm text-green-600 dark:text-green-400 mt-2';
        } catch (error) {
            console.error("Error saving social links:", error);
            socialLinksMessage.textContent = `Error: ${error.message}`;
            socialLinksMessage.className = 'text-sm text-red-600 dark:text-red-400 mt-2';
        }
    });
  }
