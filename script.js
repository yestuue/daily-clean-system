// 1. Splash Screen
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, 2000);

    initTimeLogic();
    initScrollLogic();
    initMobileNav();
    initCounters();
    initBookingForm();
    initPricingToggle();
    initAccordion();
    initLoyaltyForm();
});

// 2. Time & Store Status Logic
function initTimeLogic() {
    const watNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
    const day = watNow.getDay();
    const hour = watNow.getHours();

    const badge = document.getElementById('status-badge');
    if (badge) {
        const textSpan = badge.querySelector('.status-text');
        badge.classList.add('open');
        badge.classList.remove('closed');
        if (textSpan) textSpan.textContent = 'Available to Book';
    }

    const banner = document.getElementById('promo-banner');
    if (banner && day >= 1 && day <= 6 && hour < 12) {
        banner.classList.remove('hidden');
    }

    const closeBtn = document.querySelector('.close-banner');
    if (closeBtn && banner) {
        closeBtn.addEventListener('click', () => banner.classList.add('hidden'));
    }
}

// 3. Scroll Logic
function initScrollLogic() {
    const navbar = document.getElementById('navbar');
    const scrollProgress = document.querySelector('.scroll-progress');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (scrollProgress) scrollProgress.style.width = scrolled + '%';
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal, .slide-right').forEach(el => {
        observer.observe(el);
    });
}

// 4. Mobile Nav
function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const drawer = document.getElementById('mobile-drawer');
    const closeDrawer = document.querySelector('.close-drawer');
    const links = document.querySelectorAll('.mobile-link, .mobile-btn');

    const openMenu = () => drawer.classList.add('open');
    const closeMenu = () => drawer.classList.remove('open');

    if (hamburger) hamburger.addEventListener('click', openMenu);
    if (closeDrawer) closeDrawer.addEventListener('click', closeMenu);
    links.forEach(link => link.addEventListener('click', closeMenu));
}

// 5. Live Stats Counters
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    const animateCounters = () => {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000;
            const suffix = counter.getAttribute('data-suffix') || '';
            const isDecimal = counter.getAttribute('data-decimals');
            const stepTime = Math.abs(Math.floor(duration / (isDecimal ? target * 10 : target)));

            let current = 0;
            const timer = setInterval(() => {
                if (isDecimal) {
                    current += 0.1;
                    if (current >= target) {
                        counter.innerText = target.toFixed(1) + suffix;
                        clearInterval(timer);
                    } else {
                        counter.innerText = current.toFixed(1) + suffix;
                    }
                } else {
                    current += Math.ceil(target / 100);
                    if (current >= target) {
                        counter.innerText = target.toLocaleString() + suffix;
                        clearInterval(timer);
                    } else {
                        counter.innerText = current.toLocaleString() + suffix;
                    }
                }
            }, stepTime || 10);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
            hasAnimated = true;
            animateCounters();
        }
    });

    const statsSection = document.querySelector('.live-stats');
    if (statsSection) observer.observe(statsSection);
}

// 6. Booking Form Multi-step
function initBookingForm() {
    let currentStep = 1;
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');

    const dateInput = document.getElementById('pickup-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    const updateUI = () => {
        steps.forEach(step => step.classList.remove('active'));
        document.getElementById(`step-${currentStep}`).classList.add('active');

        progressSteps.forEach((progress, idx) => {
            if (idx < currentStep) {
                progress.classList.add('active');
            } else {
                progress.classList.remove('active');
            }
        });

        if (currentStep === 4) {
            const selectedServices = Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value);
            const date = document.getElementById('pickup-date').value || 'Not set';
            const timeSlot = document.querySelector('input[name="timeSlot"]:checked').value;
            const fullName = document.getElementById('fullName').value || 'Not set';
            const address = document.getElementById('address').value || 'Not set';
            const notes = document.getElementById('notes').value || 'None';

            document.getElementById('summary-services').textContent = selectedServices.length > 0 ? selectedServices.join(', ') : 'None selected';
            document.getElementById('summary-date').textContent = date;
            document.getElementById('summary-time').textContent = timeSlot;
            document.getElementById('summary-name').textContent = fullName;
            document.getElementById('summary-address').textContent = address;
            document.getElementById('summary-notes').textContent = notes;
        }
    };

    const validateStep = (stepNum) => {
        if (stepNum === 1) {
            const checked = document.querySelectorAll('input[name="service"]:checked');
            if (checked.length === 0) { alert('Please select at least one service.'); return false; }
        }
        if (stepNum === 2) {
            const dateStr = document.getElementById('pickup-date').value;
            if (!dateStr) { alert('Please select a date.'); return false; }
        }
        if (stepNum === 3) {
            const name = document.getElementById('fullName').value;
            const phone = document.getElementById('whatsappNo').value;
            const isDelivery = document.querySelector('input[name="delivery"]:checked').value === "Pickup & Delivery";
            const address = document.getElementById('address').value;
            if (!name || !phone) { alert('Please fill in your Name and WhatsApp Number.'); return false; }
            if (isDelivery && !address) { alert('Please provide a delivery address.'); return false; }
        }
        return true;
    };

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) { currentStep++; updateUI(); }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) { currentStep--; updateUI(); }
        });
    });

    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    const addressGroup = document.getElementById('address-group');
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (addressGroup) addressGroup.style.display = e.target.value === 'Drop Off Myself' ? 'none' : 'block';
        });
    });

    const generateMessageBody = () => {
        const selectedServices = Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value).join(', ');
        const date = document.getElementById('pickup-date').value;
        const timeSlot = document.querySelector('input[name="timeSlot"]:checked').value;
        const name = document.getElementById('fullName').value;
        const phone = document.getElementById('whatsappNo').value;
        const address = document.getElementById('address').value;
        const notes = document.getElementById('notes').value;

        return `Hi Daily Clean! I'd like to book a laundry pickup.
*Services:* ${selectedServices}
*Date:* ${date} | *Time:* ${timeSlot}
*Name:* ${name}
*Phone:* ${phone}
*Address:* ${address}
*Notes:* ${notes || 'None'}`;
    };

    // ✅ FIXED: Block confetti on failure, show WhatsApp fallback
    const submitBooking = async (callback) => {
        const payload = {
            services: Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value).join(', '),
            date:     document.getElementById('pickup-date').value,
            timeSlot: document.querySelector('input[name="timeSlot"]:checked').value,
            fullName: document.getElementById('fullName').value,
            phone:    document.getElementById('whatsappNo').value,
            address:  document.getElementById('address').value,
            notes:    document.getElementById('notes').value
        };

        // Remove any previous error banner
        document.getElementById('booking-api-error')?.remove();

        let savedOk = false;
        try {
            const res = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                savedOk = true;
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server error ${res.status}`);
            }
        } catch (err) {
            // Show inline error banner with WhatsApp fallback
            const errorBanner = document.createElement('div');
            errorBanner.id = 'booking-api-error';
            errorBanner.style.cssText =
                'background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:20px;';
            errorBanner.innerHTML = `
                <p style="color:#b91c1c;font-weight:600;margin-bottom:10px;">
                    ⚠️ Could not save your booking online (${err.message}).
                </p>
                <p style="color:#555;font-size:0.9rem;margin-bottom:12px;">
                    No problem — tap below to send your order directly via WhatsApp instead.
                </p>
                <a href="https://wa.me/2347084588119?text=${encodeURIComponent(generateMessageBody())}"
                   target="_blank"
                   class="btn btn-whatsapp"
                   style="display:inline-flex;gap:8px;align-items:center;">
                   <i class="fa-brands fa-whatsapp"></i> Send via WhatsApp
                </a>`;

            const submitArea = document.querySelector('#step-4 .form-actions');
            submitArea?.parentNode.insertBefore(errorBanner, submitArea);
            return; // ← no confetti on failure
        }

        if (savedOk) {
            fireConfetti();
            setTimeout(() => { callback(); resetForm(); }, 800);
        }
    };

    const whatsappBtn = document.getElementById('submit-whatsapp');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', async () => {
            whatsappBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            whatsappBtn.disabled = true;
            await submitBooking(() => {
                const msg = encodeURIComponent(generateMessageBody());
                window.open(`https://wa.me/2347084588119?text=${msg}`, '_blank');
            });
            whatsappBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> WhatsApp';
            whatsappBtn.disabled = false;
        });
    }

    const emailBtn = document.getElementById('submit-email');
    if (emailBtn) {
        emailBtn.addEventListener('click', async () => {
            emailBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            emailBtn.disabled = true;
            await submitBooking(() => {
                const msg = encodeURIComponent(generateMessageBody());
                window.location.href = `mailto:hello@dailyclean.com.ng?subject=New Laundry Booking&body=${msg}`;
            });
            emailBtn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send via Email';
            emailBtn.disabled = false;
        });
    }

    const resetForm = () => {
        currentStep = 1;
        document.getElementById('booking-form').reset();
        updateUI();
    };
}

// 7. Pricing Toggle
function initPricingToggle() {
    const toggle = document.getElementById('pricing-switch');
    const cards = document.querySelectorAll('.price-card');
    if (!toggle) return;

    toggle.addEventListener('change', (e) => {
        const paygLabel = document.getElementById('payg-toggle');
        const subLabel = document.getElementById('sub-toggle');
        if (e.target.checked) {
            if (subLabel) subLabel.style.color = 'var(--primary-blue)';
            if (paygLabel) paygLabel.style.color = '#666';
        } else {
            if (paygLabel) paygLabel.style.color = 'var(--primary-blue)';
            if (subLabel) subLabel.style.color = '#666';
        }
        cards.forEach(card => {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = card.classList.contains('popular-card') ? 'scale(1.05)' : '';
            }, 200);
        });
    });
}

// 8. FAQ Accordion
function initAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = item.querySelector('.accordion-content');

            document.querySelectorAll('.accordion-item').forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                    other.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            item.classList.toggle('active');
            content.style.maxHeight = item.classList.contains('active') ? content.scrollHeight + 'px' : null;
        });
    });
}

// 9. Loyalty Form
function initLoyaltyForm() {
    const loyaltySubmit = document.getElementById('loyalty-submit');
    const loyaltyEmail = document.getElementById('loyalty-email');
    const loyaltyMsg = document.getElementById('loyalty-msg');

    if (loyaltySubmit && loyaltyEmail) {
        loyaltySubmit.addEventListener('click', async () => {
            const email = loyaltyEmail.value.trim();
            if (!email || !email.includes('@')) {
                if (loyaltyMsg) loyaltyMsg.textContent = 'Please enter a valid email address.';
                return;
            }

            loyaltySubmit.textContent = 'Saving...';
            loyaltySubmit.disabled = true;

            try {
                const res = await fetch('/api/loyalty', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (res.ok) {
                    fireConfetti();
                    loyaltyEmail.value = '';
                    if (loyaltyMsg) {
                        loyaltyMsg.innerHTML = '🎉 You\'re on the list! We\'ll be in touch with exclusive deals.';
                    }
                } else {
                    const data = await res.json();
                    if (loyaltyMsg) loyaltyMsg.textContent = data.error || 'Something went wrong.';
                }
            } catch (err) {
                if (loyaltyMsg) loyaltyMsg.textContent = 'Connection error. Please try again.';
            } finally {
                loyaltySubmit.textContent = 'Join Now 🎊';
                loyaltySubmit.disabled = false;
            }
        });
    }
}

// Confetti
function fireConfetti() {
    if (typeof confetti !== 'undefined') {
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#1A7DC4', '#29C4E0', '#F5C842'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#1A7DC4', '#29C4E0', '#F5C842'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
}