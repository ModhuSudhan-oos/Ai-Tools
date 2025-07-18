import { db } from './firebase-config.js';
import { showAlert } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const newsletterForm = document.getElementById('newsletter-form');
    const subscriberEmailInput = document.getElementById('subscriber-email');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = subscriberEmailInput.value;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showAlert('Please enter a valid email address.', 'error');
                return;
            }

            try {
                // Check if email already exists
                const existingSubscriber = await db.collection('subscribers').where('email', '==', email).get();
                if (!existingSubscriber.empty) {
                    showAlert('This email is already subscribed!', 'warning');
                    return;
                }

                await db.collection('subscribers').add({
                    email: email,
                    subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showAlert('Thanks for subscribing to our newsletter!', 'success');
                newsletterForm.reset(); // Clear the form
            } catch (error) {
                console.error("Error adding subscriber:", error);
                showAlert('Failed to subscribe. Please try again later.', 'error');
            }
        });
    }
});
