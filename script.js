// 1. Splash Screen
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, 2000);

    // Initialize logic
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
    // Lagos is WAT (UTC+1)
    const getWATTime = () => {
        const now = new Date();
        const watOffset = 1 * 60 * 60 * 1000;
        const localOffset = now.getTimezoneOffset() * 60 * 1000;
        return new Date(now.getTime() + localOffset + watOffset);
    };

    const watNow = getWATTime();
    const day = watNow.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const hour = watNow.getHours();

    let isOpen = false;
    if (day >= 1 && day <= 6) {
        // Mon-Sat: 7am to 8pm (20:00)
        if (hour >= 7 && hour < 20) isOpen = true;
    } else if (day === 0) {
        // Sun: 9am to 5pm (17:00)
        if (hour >= 9 && hour < 17) isOpen = true;
    }

    // Update Badge
    const badge = document.getElementById('status-badge');
    if (badge) {
        const textSpan = badge.querySelector('.status-text');
        if (isOpen) {
            badge.classList.add('open');
            badge.classList.remove('closed');
            textSpan.textContent = 'Currently Open';
        } else {
            badge.classList.add('closed');
            badge.classList.remove('open');
            textSpan.textContent = 'Currently Closed';
        }
    }

    // Update Promo Banner (Show if Mon-Sat, before 12pm)
    const banner = document.getElementById('promo-banner');
    if (banner && day >= 1 && day <= 6 && hour < 12) {
        banner.classList.remove('hidden');
    }

    const closeBanner = document.querySelector('.close-banner');
    if (closeBanner) {
        closeBanner.addEventListener('click', () => {
            banner.classList.add('hidden');
        });
    }

    // Randomize "Orders Today" counter
    const randomOrders = document.getElementById('random-orders');
    if (randomOrders) {
        // random number between 30 and 120
        randomOrders.textContent = Math.floor(Math.random() * (120 - 30 + 1)) + 30;
    }
}

// 3. Scroll Logic (Navbar, Progress, Reveal)
function initScrollLogic() {
    const navbar = document.getElementById('navbar');
    const scrollProgress = document.querySelector('.scroll-progress');
    
    window.addEventListener('scroll', () => {
        // Navbar styling
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Scroll progress
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if(scrollProgress) scrollProgress.style.width = scrolled + '%';
    });

    // Intersection Observer for Reveal Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => {
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

    if(hamburger) hamburger.addEventListener('click', openMenu);
    if(closeDrawer) closeDrawer.addEventListener('click', closeMenu);
    links.forEach(link => link.addEventListener('click', closeMenu));
}

// 5. Live Stats Counters
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    const animateCounters = () => {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; // ms
            const suffix = counter.getAttribute('data-suffix') || '';
            const isDecimal = counter.getAttribute('data-decimals');
            const stepTime = Math.abs(Math.floor(duration / (isDecimal ? target*10 : target)));
            
            let current = 0;
            const timer = setInterval(() => {
                if(isDecimal) {
                    current += 0.1;
                    if(current >= target) {
                        counter.innerText = target.toFixed(1) + suffix;
                        clearInterval(timer);
                    } else {
                        counter.innerText = current.toFixed(1) + suffix;
                    }
                } else {
                    current += Math.ceil(target / 100);
                    if(current >= target) {
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
        if(entries[0].isIntersecting && !hasAnimated) {
            hasAnimated = true;
            animateCounters();
        }
    });
    
    const statsSection = document.querySelector('.live-stats');
    if(statsSection) observer.observe(statsSection);
}

// 6. Booking Form Multi-step Logic
function initBookingForm() {
    let currentStep = 1;
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');
    
    // Set min date to today
    const dateInput = document.getElementById('pickup-date');
    if(dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    const updateUI = () => {
        steps.forEach(step => step.classList.remove('active'));
        document.getElementById(`step-${currentStep}`).classList.add('active');
        
        progressSteps.forEach((progress, idx) => {
            if(idx < currentStep) {
                progress.classList.add('active');
            } else {
                progress.classList.remove('active');
            }
        });

        // Update Summary if going to Step 4
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
            if(checked.length === 0) {
                alert('Please select at least one service.');
                return false;
            }
        }
        if (stepNum === 2) {
            const dateStr = document.getElementById('pickup-date').value;
            if(!dateStr) {
                alert('Please select a date.');
                return false;
            }
        }
        if (stepNum === 3) {
            const name = document.getElementById('fullName').value;
            const phone = document.getElementById('whatsappNo').value;
            const isDelivery = document.querySelector('input[name="delivery"]:checked').value === "Pickup & Delivery";
            const address = document.getElementById('address').value;
            
            if(!name || !phone) {
                alert('Please fill in your Name and WhatsApp Number.');
                return false;
            }
            if(isDelivery && !address) {
                alert('Please provide a delivery address.');
                return false;
            }
        }
        return true;
    };

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(validateStep(currentStep)) {
                currentStep++;
                updateUI();
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(currentStep > 1) {
                currentStep--;
                updateUI();
            }
        });
    });

    // Toggle Address field requirement based on delivery choice
    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    const addressGroup = document.getElementById('address-group');
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'Drop Off Myself') {
                addressGroup.style.display = 'none';
            } else {
                addressGroup.style.display = 'block';
            }
        });
    });

    // Final Submission Logic
    const whatsappBtn = document.getElementById('submit-whatsapp');
    const emailBtn = document.getElementById('submit-email');

    const generateMessageBody = () => {
        const selectedServices = Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value).join(', ');
        const date = document.getElementById('pickup-date').value;
        const timeSlot = document.querySelector('input[name="timeSlot"]:checked').value;
        const name = document.getElementById('fullName').value;
        const address = document.getElementById('address').value;
        const notes = document.getElementById('notes').value;

        return `Hi Daily Clean! I'd like to book a laundry pickup.
*Services:* ${selectedServices}
*Date:* ${date} | *Time:* ${timeSlot}
*Name:* ${name}
*Address:* ${address}
*Notes:* ${notes}`;
    };

    if(whatsappBtn) {
        whatsappBtn.addEventListener('click', async () => {
            const oldText = whatsappBtn.innerHTML;
            whatsappBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            whatsappBtn.disabled = true;

            // 1. Submit to Database API
            const payload = {
                services: Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value).join(', '),
                date: document.getElementById('pickup-date').value,
                timeSlot: document.querySelector('input[name="timeSlot"]:checked').value,
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('whatsappNo').value,
                address: document.getElementById('address').value,
                notes: document.getElementById('notes').value
            };

            try {
                await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch(e) {
                console.error('Backend save failed, redirecting anyway');
            }

            // 2. Redirect to WhatsApp
            const msg = encodeURIComponent(generateMessageBody());
            fireConfetti();
            
            whatsappBtn.innerHTML = oldText;
            whatsappBtn.disabled = false;

            setTimeout(() => {
                window.open(`https://wa.me/2347084588119?text=${msg}`, '_blank');
                resetForm();
            }, 800);
        });
    }

    if(emailBtn) {
        emailBtn.addEventListener('click', async () => {
             const oldText = emailBtn.innerHTML;
            emailBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            emailBtn.disabled = true;

            // 1. Submit to Database API
            const payload = {
                services: Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value).join(', '),
                date: document.getElementById('pickup-date').value,
                timeSlot: document.querySelector('input[name="timeSlot"]:checked').value,
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('whatsappNo').value,
                address: document.getElementById('address').value,
                notes: document.getElementById('notes').value
            };

            try {
                await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch(e) {
                console.error('Backend save failed, redirecting anyway');
            }

            // 2. Open Mail client
            const msg = encodeURIComponent(generateMessageBody());
            fireConfetti();
            
            emailBtn.innerHTML = oldText;
            emailBtn.disabled = false;

            setTimeout(() => {
                window.location.href = `mailto:hello@dailyclean.com.ng?subject=New Laundry Booking&body=${msg}`;
                resetForm();
            }, 800);
        });
    }

    const resetForm = () => {
        currentStep = 1;
        document.getElementById('booking-form').reset();
        updateUI();
        alert('Thank you! We have received your booking details process request.');
    }
}

// 7. Pricing Toggle
function initPricingToggle() {
    const toggle = document.getElementById('pricing-switch');
    const cards = document.querySelectorAll('.price-card');
    if(!toggle) return;

    toggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            document.getElementById('sub-toggle').style.color = 'var(--primary-blue)';
            document.getElementById('payg-toggle').style.color = '#666';
        } else {
            document.getElementById('payg-toggle').style.color = 'var(--primary-blue)';
            document.getElementById('sub-toggle').style.color = '#666';
        }
        
        // Add a little bounce animation when swiping
        cards.forEach(card => {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = card.classList.contains('popular-card') ? 'scale(1.05)' : 'none';
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
            
            // Close others
            document.querySelectorAll('.accordion-item').forEach(other => {
                if(other !== item) {
                    other.classList.remove('active');
                    other.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            // Toggle current
            item.classList.toggle('active');
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });
}

// 9. Loyalty Form & Confetti
function initLoyaltyForm() {
    const form = document.getElementById('loyalty-form');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const input = form.querySelector('input[type="email"]');
            
            const oldText = btn.innerHTML;
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/loyalty', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: input.value })
                });

                if (res.ok) {
                    fireConfetti();
                    form.innerHTML = `<h3><i class="fa-solid fa-check-circle" style="color:var(--gold-accent);"></i> You're on the list! 🎊</h3>`;
                } else {
                    const data = await res.json();
                    alert(data.error || 'Something went wrong.');
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert('Connection error.');
                btn.innerHTML = oldText;
                btn.disabled = false;
            }
        });
    }

    // Dismiss Whatsapp tooltip
    const closeTooltip = document.querySelector('.close-tooltip');
    if(closeTooltip) {
        closeTooltip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelector('.whatsapp-tooltip').classList.add('dismissed');
        });
    }
}

function fireConfetti() {
    if(typeof confetti !== 'undefined') {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#1A7DC4', '#29C4E0', '#F5C842']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#1A7DC4', '#29C4E0', '#F5C842']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }
}
