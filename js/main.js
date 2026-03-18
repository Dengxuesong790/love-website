// ===================================
// 主 JavaScript 文件
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有模块
    initTimer();
    initMusicPlayer();
    initScrollAnimations();
    initTimelineAnimation();
    initGallery();
    initLightbox();
    initNavDots();
    initBackToTop();
    initHeartEffect();
});

// ===================================
// 计时器功能
// ===================================

function initTimer() {
    const startDate = new Date('2026-04-11T00:00:00');
    
    function updateTimer() {
        const now = new Date();
        const diff = now - startDate;
        
        if (diff < 0) {
            // 如果还没到开始日期
            document.getElementById('days').textContent = '0';
            document.getElementById('hours').textContent = '0';
            document.getElementById('minutes').textContent = '0';
            document.getElementById('seconds').textContent = '0';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// ===================================
// 音乐播放器功能
// ===================================

function initMusicPlayer() {
    const musicControl = document.getElementById('musicControl');
    const bgMusic = document.getElementById('bgMusic');
    const musicStatus = musicControl.querySelector('.music-status');
    let isPlaying = false;
    
    // 尝试自动播放（需要用户交互后才能成功）
    setTimeout(() => {
        bgMusic.play().then(() => {
            isPlaying = true;
            musicStatus.textContent = '音乐播放中';
        }).catch(() => {
            // 自动播放失败，等待用户点击
            musicStatus.textContent = '点击播放音乐';
        });
    }, 1000);
    
    musicControl.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (isPlaying) {
            bgMusic.pause();
            musicControl.classList.add('paused');
            musicStatus.textContent = '音乐已暂停';
        } else {
            bgMusic.play();
            musicControl.classList.remove('paused');
            musicStatus.textContent = '音乐播放中';
        }
        
        isPlaying = !isPlaying;
        createHeartEffect(e.clientX, e.clientY);
    });
}

// ===================================
// 滚动动画
// ===================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // 对于 fade-in-up 类的元素，添加延迟效果
                if (entry.target.classList.contains('fade-in-up')) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, delay);
                }
            }
        });
    }, observerOptions);
    
    // 观察所有需要动画的元素
    document.querySelectorAll('.fade-in-up, .scroll-animate').forEach(el => {
        observer.observe(el);
    });
}

// ===================================
// 时间线动画
// ===================================

function initTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
    });
    
    timelineItems.forEach(item => {
        observer.observe(item);
    });
}

// ===================================
// 相册轮播功能
// ===================================

function initGallery() {
    const track = document.getElementById('galleryTrack');
    const items = track.querySelectorAll('.gallery-item');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('galleryDots');
    
    let currentIndex = 0;
    const totalItems = items.length;
    
    // 创建指示点
    for (let i = 0; i < totalItems; i++) {
        const dot = document.createElement('div');
        dot.classList.add('gallery-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }
    
    const dots = dotsContainer.querySelectorAll('.gallery-dot');
    
    function updateGallery() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // 更新指示点
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    function goToSlide(index) {
        currentIndex = index;
        updateGallery();
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalItems;
        updateGallery();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateGallery();
    }
    
    // 事件监听
    nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        nextSlide();
        createHeartEffect(e.clientX, e.clientY);
    });
    
    prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        prevSlide();
        createHeartEffect(e.clientX, e.clientY);
    });
    
    // 触摸滑动支持
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    track.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 向左滑动
                nextSlide();
            } else {
                // 向右滑动
                prevSlide();
            }
        }
    }
    
    // 自动轮播（可选）
    // setInterval(nextSlide, 5000);
}

// ===================================
// 图片放大功能
// ===================================

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('prevLightbox');
    const nextBtn = document.getElementById('nextLightbox');
    const galleryImages = Array.from(document.querySelectorAll('.gallery-item img'));
    
    let currentImageIndex = 0;
    
    // 点击图片打开放大视图
    galleryImages.forEach((img, index) => {
        img.parentElement.addEventListener('click', function(e) {
            e.stopPropagation();
            currentImageIndex = index;
            openLightbox(img.src);
            createHeartEffect(e.clientX, e.clientY);
        });
    });
    
    function openLightbox(src) {
        lightboxImage.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function showPrevImage() {
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        lightboxImage.src = galleryImages[currentImageIndex].src;
    }
    
    function showNextImage() {
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        lightboxImage.src = galleryImages[currentImageIndex].src;
    }
    
    // 事件监听
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeLightbox();
        createHeartEffect(e.clientX, e.clientY);
    });
    
    prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showPrevImage();
        createHeartEffect(e.clientX, e.clientY);
    });
    
    nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showNextImage();
        createHeartEffect(e.clientX, e.clientY);
    });
    
    // 键盘控制
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        }
    });
    
    // 点击背景关闭
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
}

// ===================================
// 导航点功能
// ===================================

function initNavDots() {
    const navDots = document.querySelectorAll('.nav-dot');
    const sections = document.querySelectorAll('section');
    
    // 点击导航点跳转
    navDots.forEach(dot => {
        dot.addEventListener('click', function(e) {
            const sectionId = this.dataset.section;
            const section = document.getElementById(sectionId);
            
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
                createHeartEffect(e.clientX, e.clientY);
            }
        });
    });
    
    // 根据滚动位置更新活动状态
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navDots.forEach(dot => {
                    dot.classList.toggle('active', dot.dataset.section === id);
                });
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

// ===================================
// 返回顶部功能
// ===================================

function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    
    backToTopBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        createHeartEffect(e.clientX, e.clientY);
    });
}

// ===================================
// 爱心飘落特效
// ===================================

function initHeartEffect() {
    // 为所有按钮添加爱心特效
    document.querySelectorAll('button, .btn-heart-effect, .nav-dot, .back-to-top').forEach(element => {
        element.addEventListener('click', function(e) {
            createMultipleHearts(e.clientX, e.clientY);
        });
    });
    
    // 全局点击也可以产生爱心（可选）
    document.addEventListener('click', function(e) {
        if (!e.target.closest('button, .nav-dot, .back-to-top')) {
            createHeartEffect(e.clientX, e.clientY);
        }
    });
}

function createHeartEffect(x, y) {
    const heartsContainer = document.getElementById('heartsContainer');
    const heart = document.createElement('div');
    heart.classList.add('falling-heart');
    heart.textContent = getRandomHeart();
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    heart.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
    
    // 随机大小
    const size = Math.random() * 20 + 15;
    heart.style.fontSize = size + 'px';
    
    heartsContainer.appendChild(heart);
    
    // 动画结束后移除
    setTimeout(() => {
        heart.remove();
    }, 2000);
}

function createMultipleHearts(x, y) {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 50;
            createHeartEffect(x + offsetX, y + offsetY);
        }, i * 100);
    }
}

function getRandomHeart() {
    const hearts = ['💕', '💖', '💗', '💓', '💞', '❤️', '🩷'];
    return hearts[Math.floor(Math.random() * hearts.length)];
}

// ===================================
// 图片懒加载
// ===================================

if ('loading' in HTMLImageElement.prototype) {
    // 浏览器原生支持 loading="lazy"
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
    });
} else {
    // 降级处理：使用 Intersection Observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===================================
// 性能优化
// ===================================

// 防抖函数
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

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===================================
// 控制台欢迎信息
// ===================================

console.log('%c💕 欢迎来到王斐和邓雪松的爱情世界 💕', 
    'font-size: 20px; color: #FF69B4; font-weight: bold;');
console.log('%c愿每一份爱意都被温柔以待', 
    'font-size: 14px; color: #FFB6C1;');
console.log('%c网站制作时间：2026 年 3 月', 
    'font-size: 12px; color: #7A7A7A;');
