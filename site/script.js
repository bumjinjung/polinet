// ===== Smooth Scroll Navigation with Enhanced Animation =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId === '#hero') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            document.querySelector('.nav-menu').classList.remove('active');
            return;
        }
        
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            const headerHeight = document.querySelector('#header').offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight;
            
            // 부드러운 스크롤 애니메이션
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            document.querySelector('.nav-menu').classList.remove('active');
            
            // 활성 메뉴 표시
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
        }
    });
});

// ===== Header Scroll Effect =====
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const header = document.querySelector('#header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScrollTop = scrollTop;
});

// ===== Mobile Menu Toggle =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#header')) {
        navMenu.classList.remove('active');
    }
});

// ===== Stats Count-Up (Slot-like) =====
function animateCountUp(element, targetValue, suffix = '', duration = 1200) {
    const start = 0;
    const startTime = performance.now();
    const format = (value) => {
        const rounded = Math.floor(value);
        return `${rounded.toLocaleString()}${suffix}`;
    };
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = start + (targetValue - start) * ease;
        element.textContent = format(current);
        if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function initStatsObserver() {
    const stats = document.querySelectorAll('.stat-number');
    if (!stats.length) return;
    const once = new WeakSet();
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !once.has(entry.target)) {
                once.add(entry.target);
                const el = entry.target;
                const target = parseInt(el.dataset.target || '0', 10);
                const suffix = el.dataset.suffix || '';
                animateCountUp(el, target, suffix);
            }
        });
    }, { threshold: 0.4 });
    stats.forEach(el => io.observe(el));
}

window.addEventListener('DOMContentLoaded', initStatsObserver);

// ===== Products Data =====
const products = [
    {
        category: 'pom',
        name: 'POM (Polyacetal)',
        brand: 'DURACON®',
        description: '우수한 기계적 강도, 강성 및 치수 안정성을 가진 엔지니어링 플라스틱으로 마찰 특성이 뛰어나며 내피로성이 우수합니다.',
        grades: ['M90-44', 'SW-01', 'NW-02'],
        applications: [
            { name: '기어', icon: '⚙️' },
            { name: '자동차 부품', icon: '🚗' },
            { name: '베어링', icon: '🔩' }
        ]
    },
    {
        category: 'pbt',
        name: 'PBT (Polybutylene Terephthalate)',
        brand: 'DURANEX®',
        description: '전기적 특성과 내열성이 우수하며, 치수 안정성과 내약품성이 뛰어난 열가소성 폴리에스터 수지입니다.',
        grades: ['330HR', '3300', '315NF'],
        applications: [
            { name: '커넥터', icon: '🔌' },
            { name: '전장부품', icon: '⚡' },
            { name: '자동차', icon: '🚙' }
        ]
    },
    {
        category: 'pps',
        name: 'PPS (Polyphenylene Sulfide)',
        brand: 'DURAFIDE®',
        description: '탁월한 내열성(240°C), 내약품성 및 기계적 강도를 가진 슈퍼 엔지니어링 플라스틱으로 난연성이 우수합니다.',
        grades: ['1140A6', '6150T73', '6465A62'],
        applications: [
            { name: '엔진룸', icon: '🏎️' },
            { name: '펌프', icon: '💧' },
            { name: '전기부품', icon: '🔋' }
        ]
    },
    {
        category: 'lcp',
        name: 'LCP (Liquid Crystal Polymer)',
        brand: 'LAPEROS®',
        description: '초정밀 성형이 가능한 고성능 열가소성 수지로, 낮은 성형 수축률과 우수한 치수 안정성을 제공합니다.',
        grades: ['E130i', 'E471i', 'E481i'],
        applications: [
            { name: '커넥터', icon: '📱' },
            { name: '안테나', icon: '📡' },
            { name: '카메라', icon: '📷' }
        ]
    },
    {
        category: 'coc',
        name: 'COC (Cyclo Olefin Copolymer)',
        brand: 'TOPAS®',
        description: '높은 투명성, 낮은 수분 흡수율 및 우수한 생체 적합성을 가진 투명 플라스틱으로 광학 및 의료 분야에 최적입니다.',
        grades: ['6013', '8007', '5013'],
        applications: [
            { name: '의료기기', icon: '💉' },
            { name: '광학렌즈', icon: '🔬' },
            { name: '포장재', icon: '📦' }
        ]
    },
    {
        category: 'pek',
        name: 'PEK (Polyetherketone)',
        brand: 'SARPEK',
        description: '뛰어난 내열성, 내약품성 및 기계적 강도를 가진 고성능 슈퍼 엔지니어링 플라스틱으로 극한 환경에서 사용 가능합니다.',
        grades: ['PEK-HP', 'PEK-GF30', 'PEK-CF30'],
        applications: [
            { name: '항공우주', icon: '✈️' },
            { name: '산업기계', icon: '🏗️' },
            { name: '고온부품', icon: '🔥' }
        ]
    }
];

// ===== Render Products =====
function renderProducts(filter = 'all') {
    const productsGrid = document.getElementById('productsGrid');
    const filteredProducts = filter === 'all' 
        ? products 
        : products.filter(p => p.category === filter);
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-aos="fade-up">
            <div class="product-brand">${product.brand}</div>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            <div class="product-grades">
                <div class="grades-label">주요 Grade:</div>
                <div class="grades-list">
                    ${product.grades.map(grade => `<span class="grade-tag">${grade}</span>`).join('')}
                </div>
            </div>
            <div class="product-applications">
                <div class="applications-label">APPLICATION</div>
                <div class="applications-grid">
                    ${product.applications.map(app => `
                        <div class="app-item">
                            <div class="app-icon">${app.icon}</div>
                            <div class="app-name">${app.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    // Trigger animation
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('aos-animate');
            }, index * 100);
        });
    }, 50);
}

// Initial render
renderProducts();

// ===== Product Filter =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter products
        const filter = btn.dataset.filter;
        renderProducts(filter);
    });
});

// Contact form removed - using simple contact info display

// ===== Scroll Animations =====
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, observerOptions);

    // Observe all elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(el => {
        observer.observe(el);
    });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();

    // AOS Init
    AOS.init({
        duration: 800,
        once: true,
        offset: 50,
    });
});

// ===== Active Menu Item on Scroll =====
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// ===== Lazy Loading Images (if any added later) =====
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== Scroll Progress Indicator (Optional) =====
function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    let progressBar = document.getElementById('scrollProgress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'scrollProgress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-600), var(--secondary-600));
            z-index: 9999;
            transition: width 0.3s ease;
        `;
        document.body.appendChild(progressBar);
    }
    
    progressBar.style.width = scrolled + '%';
}

window.addEventListener('scroll', updateScrollProgress);

// ===== Performance Optimization =====
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll-heavy functions
window.addEventListener('scroll', debounce(() => {
    // Heavy scroll operations here
}, 100));

// ===== Console Welcome Message =====
console.log('%c🚀 Polinet - 전문 화학 소재 에이전트', 'color: #0069ff; font-size: 20px; font-weight: bold;');
console.log('%c웹사이트에 오신 것을 환영합니다!', 'color: #0284c7; font-size: 14px;');

