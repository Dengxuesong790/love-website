// ===================================
// 配置加载模块 - 从后端 API 动态加载配置
// ===================================

const CONFIG_API_BASE = window.API_BASE || 'http://localhost:8080/api';

// 配置缓存
let configCache = {};
let isConfigLoaded = false;

/**
 * 加载网站配置
 */
async function loadWebsiteConfigs() {
    if (isConfigLoaded) {
        console.log('配置已加载，使用缓存');
        return true;
    }

    try {
        console.log('正在从 API 加载配置...');
        
        // 尝试从 API 加载配置
        const response = await fetch(`${CONFIG_API_BASE}/config/all`);
        
        if (!response.ok) {
            throw new Error('API 请求失败');
        }

        const result = await response.json();
        
        if (result.code === 200) {
            // 解析配置
            result.data.forEach(config => {
                configCache[config.configKey] = config.configValue;
            });

            // 应用配置到页面
            applyConfigs();
            
            isConfigLoaded = true;
            console.log('✅ 配置加载成功');
            return true;
        } else {
            throw new Error(result.message || '配置加载失败');
        }
    } catch (error) {
        console.warn('⚠️ 无法从 API 加载配置，使用默认配置:', error.message);
        // 使用默认配置（不修改页面）
        // 加载本地默认音乐
        await loadMusicResource();
        return false;
    }
}

/**
 * 应用配置到页面
 */
function applyConfigs() {
    console.log('开始应用配置...');

    // 1. 应用基础配置
    if (configCache['site.title']) {
        document.title = configCache['site.title'];
    }

    if (configCache['site.couple_names']) {
        updateElementText('.couple-names', configCache['site.couple_names']);
        updateElementText('.header-title', configCache['site.couple_names']);
    }

    if (configCache['site.description']) {
        updateElementText('.main-title', configCache['site.description']);
    }

    if (configCache['site.start_date']) {
        // 更新计时器日期
        window.startDateStr = configCache['site.start_date'];
        if (typeof initTimer === 'function') {
            // 重新初始化计时器
            initTimer();
        }
    }

    // 2. 应用情书配置
    if (configCache['letter.title']) {
        updateElementText('.letter-title', configCache['letter.title']);
    }

    if (configCache['letter.content']) {
        updateLetterContent(configCache['letter.content']);
    }

    if (configCache['letter.signature']) {
        updateElementText('.letter-signature', configCache['letter.signature'], true);
    }

    // 3. 应用时间线配置
    if (configCache['timeline.events']) {
        try {
            const events = JSON.parse(configCache['timeline.events']);
            updateTimelineEvents(events);
        } catch (e) {
            console.error('解析时间线事件失败:', e);
        }
    }

    // 4. 应用音乐配置
    loadMusicResource();

    // 5. 应用图片资源配置
    loadGalleryImages();

    console.log('✅ 配置应用完成');
}

/**
 * 更新文本内容
 */
function updateElementText(selector, text, useHTML = false) {
    const element = document.querySelector(selector);
    if (element) {
        if (useHTML) {
            element.innerHTML = text.replace(/\n/g, '<br>');
        } else {
            element.textContent = text;
        }
    }
}

/**
 * 更新情书内容
 */
function updateLetterContent(content) {
    const letterContentEl = document.querySelector('.letter-content');
    if (!letterContentEl) return;

    // 将换行符转换为 HTML 段落
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    let html = '';
    paragraphs.forEach((p, index) => {
        if (index === 0) {
            html += `<p>${p.replace(/\n/g, '<br>')}</p>`;
        } else if (p.includes('永远爱你的') || p.includes('此致') || p.includes('Love')) {
            // 签名部分
            html += `<p class="letter-signature">${p.replace(/\n/g, '<br>')}</p>`;
        } else {
            html += `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }
    });

    letterContentEl.innerHTML = html;
}

/**
 * 更新时间线事件
 */
function updateTimelineEvents(events) {
    const timelineContainer = document.querySelector('.timeline-container');
    if (!timelineContainer) return;

    // 保留时间线
    const timelineLine = timelineContainer.querySelector('.timeline-line');
    
    // 清空现有事件
    const existingItems = timelineContainer.querySelectorAll('.timeline-item');
    existingItems.forEach(item => item.remove());

    // 添加新事件
    events.forEach((event, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.setAttribute('data-date', event.date);
        
        item.innerHTML = `
            <div class="timeline-dot">
                <div class="dot-icon">${event.icon || '💕'}</div>
            </div>
            <div class="timeline-content">
                <div class="timeline-date">${event.date}</div>
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-description">${event.description}</div>
                <div class="timeline-note">${event.note || ''}</div>
            </div>
        `;

        timelineContainer.insertBefore(item, timelineLine.nextSibling);
    });

    // 重新初始化时间线动画
    if (typeof initTimelineAnimation === 'function') {
        setTimeout(() => initTimelineAnimation(), 100);
    }
}

/**
 * 加载音乐资源
 */
async function loadMusicResource() {
    try {
        const response = await fetch(`${CONFIG_API_BASE}/resource/list?type=music`);
        const result = await response.json();

        if (result.code === 200 && result.data.length > 0) {
            // 使用第一个启用的音乐
            const music = result.data.find(m => m.isEnabled) || result.data[0];
            
            const musicSource = document.getElementById('bgMusicSource');
            const bgMusic = document.getElementById('bgMusic');
            
            if (musicSource && bgMusic) {
                musicSource.src = `${CONFIG_API_BASE}${music.urlPath}`;
                
                // 重新加载音频
                bgMusic.load();
                
                console.log('✅ 音乐资源已加载:', music.resourceName);
            }
        } else {
            // 没有音乐资源，使用本地默认音乐
            setLocalDefaultMusic();
        }
    } catch (error) {
        console.warn('加载音乐资源失败，使用本地文件:', error);
        // 加载失败，使用本地默认音乐
        setLocalDefaultMusic();
    }
}

/**
 * 设置本地默认音乐
 */
function setLocalDefaultMusic() {
    console.log('🎵 正在设置本地默认音乐...');
    const musicSource = document.getElementById('bgMusicSource');
    const bgMusic = document.getElementById('bgMusic');
    
    console.log('musicSource:', musicSource);
    console.log('bgMusic:', bgMusic);
    
    if (musicSource && bgMusic) {
        musicSource.src = 'music/background.mp3';
        console.log('🎵 音乐源已设置:', musicSource.src);
        
        // 重新加载音频
        bgMusic.load();
        console.log('✅ 使用本地默认音乐');
        
        // 尝试自动播放
        bgMusic.play().then(() => {
            console.log('✅ 音乐自动播放成功');
        }).catch(error => {
            console.log('⚠️ 音乐自动播放失败，等待用户交互:', error.message);
        });
    } else {
        console.error('❌ 找不到音乐元素');
    }
}

/**
 * 加载相册图片
 */
async function loadGalleryImages() {
    try {
        const response = await fetch(`${CONFIG_API_BASE}/resource/list?type=image`);
        const result = await response.json();

        if (result.code === 200 && result.data.length > 0) {
            // 排序
            const images = result.data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            
            const galleryTrack = document.getElementById('galleryTrack');
            if (!galleryTrack) return;

            // 清空现有图片
            galleryTrack.innerHTML = '';

            // 添加新图片
            images.forEach(img => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                item.innerHTML = `
                    <img src="${CONFIG_API_BASE}${img.urlPath}" alt="${img.resourceName}" loading="lazy">
                `;

                galleryTrack.appendChild(item);
            });

            console.log(`✅ 已加载 ${images.length} 张相册图片`);

            // 重新初始化相册
            if (typeof initGallery === 'function') {
                setTimeout(() => initGallery(), 100);
            }

            // 重新初始化 lightbox
            if (typeof initLightbox === 'function') {
                setTimeout(() => initLightbox(), 100);
            }
        }
    } catch (error) {
        console.warn('加载相册图片失败，使用本地文件:', error);
    }
}

/**
 * 获取配置值
 */
function getConfig(key, defaultValue = null) {
    return configCache[key] || defaultValue;
}

/**
 * 检查配置是否已加载
 */
function isConfigReady() {
    return isConfigLoaded;
}

// 页面加载时自动加载配置
document.addEventListener('DOMContentLoaded', function() {
    // 延迟一点加载配置，确保 DOM 已准备好
    setTimeout(() => {
        loadWebsiteConfigs().then(success => {
            if (success) {
                console.log('🎉 系统已使用后端配置初始化');
            } else {
                console.log('ℹ️ 系统使用本地默认配置运行');
            }
        });
    }, 100);
});
