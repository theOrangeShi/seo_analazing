// SEO Analysis Tool
class SEOAnalyzer {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupMetrics();
    }

    bindEvents() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const urlInput = document.getElementById('websiteUrl');

        analyzeBtn.addEventListener('click', () => this.analyzeWebsite());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeWebsite();
            }
        });
    }

    setupMetrics() {
        this.metrics = {
            pageSpeed: {
                name: 'Page Speed',
                icon: 'fas fa-tachometer-alt',
                color: '#3b82f6',
                weight: 15, // 默认权重，实际使用后端动态权重
                description: 'Measures how quickly your website loads for users.',
                details: 'Page speed is crucial for user experience and SEO rankings. Google considers page speed as a ranking factor.'
            },
            mobileOptimization: {
                name: 'Mobile Optimization',
                icon: 'fas fa-mobile-alt',
                color: '#10b981',
                weight: 12, // 12% - 移动优先索引很重要
                description: 'Checks if your website is optimized for mobile devices.',
                details: 'Mobile-first indexing means Google primarily uses the mobile version of your content for indexing and ranking.'
            },
            metaTags: {
                name: 'Meta Tags',
                icon: 'fas fa-tags',
                color: '#8b5cf6',
                weight: 10, // 10% - Meta标签对搜索结果显示很重要
                description: 'Analyzes the presence and quality of meta tags.',
                details: 'Meta tags provide information about your webpage to search engines and social media platforms.'
            },
            headingStructure: {
                name: 'Heading Structure',
                icon: 'fas fa-heading',
                color: '#f59e0b',
                weight: 8, // 8% - 标题结构影响内容理解
                description: 'Evaluates the proper use of heading tags (H1, H2, H3, etc.).',
                details: 'Proper heading structure helps search engines understand your content hierarchy and improves accessibility.'
            },
            imageOptimization: {
                name: 'Image Optimization',
                icon: 'fas fa-image',
                color: '#ef4444',
                weight: 7, // 7% - 图片优化影响页面速度
                description: 'Checks if images are properly optimized for web.',
                details: 'Optimized images improve page load speed and provide better user experience.'
            },
            internalLinking: {
                name: 'Internal Linking',
                icon: 'fas fa-link',
                color: '#06b6d4',
                weight: 8, // 8% - 内部链接影响页面权重分配
                description: 'Analyzes the internal linking structure of your website.',
                details: 'Good internal linking helps distribute page authority and improves site navigation.'
            },
            sslCertificate: {
                name: 'SSL Certificate',
                icon: 'fas fa-lock',
                color: '#84cc16',
                weight: 10, // 10% - HTTPS是Google的排名因素
                description: 'Verifies if your website has a valid SSL certificate.',
                details: 'SSL certificates encrypt data transmission and are required for HTTPS, which is a ranking factor.'
            },
            socialMediaTags: {
                name: 'Social Media Tags',
                icon: 'fas fa-share-alt',
                color: '#f97316',
                weight: 5, // 5% - 社交媒体标签影响分享效果
                description: 'Checks for Open Graph and Twitter Card meta tags.',
                details: 'Social media tags control how your content appears when shared on social platforms.'
            },
            contentQuality: {
                name: 'Content Quality',
                icon: 'fas fa-file-alt',
                color: '#6366f1',
                weight: 12, // 12% - 内容质量是SEO的核心
                description: 'Evaluates content length, readability, and keyword usage.',
                details: 'High-quality, relevant content is essential for good SEO performance.'
            },
            urlStructure: {
                name: 'URL Structure',
                icon: 'fas fa-globe',
                color: '#ec4899',
                weight: 6, // 6% - URL结构影响用户体验
                description: 'Analyzes URL structure and SEO-friendliness.',
                details: 'Clean, descriptive URLs help search engines and users understand your content.'
            },
            robotsTxt: {
                name: 'Robots.txt',
                icon: 'fas fa-robot',
                color: '#6b7280',
                weight: 4, // 4% - Robots.txt影响爬虫行为
                description: 'Checks for proper robots.txt file configuration.',
                details: 'Robots.txt tells search engine crawlers which pages to crawl and which to avoid.'
            },
            sitemap: {
                name: 'XML Sitemap',
                icon: 'fas fa-sitemap',
                color: '#14b8a6',
                weight: 3, // 3% - 站点地图帮助索引
                description: 'Verifies the presence and validity of XML sitemap.',
                details: 'XML sitemaps help search engines discover and index your pages more efficiently.'
            }
        };
    }

    async analyzeWebsite() {
        const urlInput = document.getElementById('websiteUrl');
        const url = urlInput.value.trim();

        if (!url) {
            alert('Please enter a website URL');
            return;
        }

        // Validate URL format
        if (!this.isValidUrl(url)) {
            alert('Please enter a valid URL (e.g., example.com or https://example.com)');
            return;
        }

        this.showLoading();
        
        try {
            const results = await this.performAnalysis(url);
            this.displayResults(results);
        } catch (error) {
            console.error('Analysis error:', error);
            alert('分析失败，请重试。错误: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    isValidUrl(string) {
        try {
            // Add protocol if missing
            if (!string.startsWith('http://') && !string.startsWith('https://')) {
                string = 'https://' + string;
            }
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async performAnalysis(url) {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        try {
            // 调用流式API - 使用完整的后端URL
            const apiUrl = 'http://localhost:5001/api/analyze-stream';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url, fullSiteAnalysis: false })
            });
            
            if (!response.ok) {
                throw new Error('分析请求失败');
            }
            
            // 处理SSE流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let result = null;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // 处理完整的消息
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // 保留最后一个不完整的消息
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'progress') {
                            this.addProgressMessage(data.message);
                        } else if (data.type === 'complete') {
                            result = data.data;
                        } else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    }
                }
            }
            
            if (!result) {
                throw new Error('未收到分析结果');
            }
            
            // 转换API响应格式为前端期望的格式
            const results = {};
            for (const [key, metricData] of Object.entries(result.results)) {
                results[key] = {
                    score: metricData.score,
                    status: metricData.status,
                    details: metricData.details.join('; '),
                    recommendations: metricData.recommendations,
                    specificData: metricData.specificData
                };
            }
            
            // 添加后端计算的总分
            results._totalScore = {
                score: result.totalScore,
                status: result.status,
                websiteType: result.websiteType
            };
            
            return results;
            
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }
    
    addProgressMessage(message) {
        const progressContainer = document.getElementById('progressMessages');
        if (!progressContainer) {
            console.warn('progressMessages element not found');
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'progress-message';
        messageDiv.textContent = message;
        progressContainer.appendChild(messageDiv);
        
        // 自动滚动到最新消息
        progressContainer.scrollTop = progressContainer.scrollHeight;
    }
    
    clearProgressMessages() {
        const progressContainer = document.getElementById('progressMessages');
        if (progressContainer) {
            progressContainer.innerHTML = '';
        }
    }
    
    // Removed toggleCalculationMethod function

    generateMetricResult(metric, url) {
        const metricKey = Object.keys(this.metrics).find(key => this.metrics[key] === metric);
        const detailedAnalysis = this.generateDetailedAnalysis(metricKey, url);
        
        return {
            score: detailedAnalysis.score,
            status: this.getScoreStatus(detailedAnalysis.score),
            recommendations: detailedAnalysis.recommendations,
            details: detailedAnalysis.details,
            specificData: detailedAnalysis.specificData
        };
    }

    generateDetailedAnalysis(metricKey, url) {
        switch(metricKey) {
            case 'pageSpeed':
                return this.analyzePageSpeed(url);
            case 'mobileOptimization':
                return this.analyzeMobileOptimization(url);
            case 'metaTags':
                return this.analyzeMetaTags(url);
            case 'headingStructure':
                return this.analyzeHeadingStructure(url);
            case 'imageOptimization':
                return this.analyzeImageOptimization(url);
            case 'internalLinking':
                return this.analyzeInternalLinking(url);
            case 'sslCertificate':
                return this.analyzeSSLCertificate(url);
            case 'socialMediaTags':
                return this.analyzeSocialMediaTags(url);
            case 'contentQuality':
                return this.analyzeContentQuality(url);
            case 'urlStructure':
                return this.analyzeURLStructure(url);
            case 'robotsTxt':
                return this.analyzeRobotsTxt(url);
            case 'sitemap':
                return this.analyzeSitemap(url);
            default:
                return { score: 50, status: 'poor', recommendations: [], details: '', specificData: {} };
        }
    }

    // 页面速度分析
    analyzePageSpeed(url) {
        const loadTime = Math.floor(Math.random() * 3000) + 500; // 500-3500ms
        const totalSize = Math.floor(Math.random() * 2000) + 500; // 500-2500KB
        const imageSize = Math.floor(Math.random() * 800) + 200; // 200-1000KB
        const cssSize = Math.floor(Math.random() * 200) + 50; // 50-250KB
        const jsSize = Math.floor(Math.random() * 300) + 100; // 100-400KB
        
        let score = 100;
        let issues = [];
        
        if (loadTime > 2000) {
            score -= 30;
            issues.push(`页面加载时间过长: ${loadTime}ms (建议 < 2000ms)`);
        } else if (loadTime > 1500) {
            score -= 15;
            issues.push(`页面加载时间较慢: ${loadTime}ms (建议 < 1500ms)`);
        }
        
        if (totalSize > 1500) {
            score -= 25;
            issues.push(`页面总大小过大: ${totalSize}KB (建议 < 1500KB)`);
        }
        
        if (imageSize > 500) {
            score -= 20;
            issues.push(`图片资源过大: ${imageSize}KB (建议 < 500KB)`);
        }
        
        if (cssSize > 150) {
            score -= 10;
            issues.push(`CSS文件过大: ${cssSize}KB (建议 < 150KB)`);
        }
        
        if (jsSize > 200) {
            score -= 15;
            issues.push(`JavaScript文件过大: ${jsSize}KB (建议 < 200KB)`);
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '页面速度表现良好',
            specificData: {
                loadTime: loadTime,
                totalSize: totalSize,
                imageSize: imageSize,
                cssSize: cssSize,
                jsSize: jsSize
            },
            recommendations: this.generateRecommendations('Page Speed', score)
        };
    }

    // 移动优化分析
    analyzeMobileOptimization(url) {
        const hasViewport = Math.random() > 0.2; // 80%概率有viewport
        const touchTargets = Math.floor(Math.random() * 20) + 5; // 5-25个触摸目标
        const smallTouchTargets = Math.floor(Math.random() * 8); // 0-8个小触摸目标
        const fontSize = Math.floor(Math.random() * 8) + 12; // 12-20px
        const hasMobileMenu = Math.random() > 0.3; // 70%概率有移动菜单
        
        let score = 100;
        let issues = [];
        
        if (!hasViewport) {
            score -= 40;
            issues.push('缺少viewport meta标签');
        }
        
        if (smallTouchTargets > 3) {
            score -= 25;
            issues.push(`有${smallTouchTargets}个触摸目标过小 (< 44px)`);
        }
        
        if (fontSize < 14) {
            score -= 20;
            issues.push(`字体过小: ${fontSize}px (建议 ≥ 14px)`);
        }
        
        if (!hasMobileMenu) {
            score -= 15;
            issues.push('缺少移动端导航菜单');
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '移动优化表现良好',
            specificData: {
                hasViewport: hasViewport,
                touchTargets: touchTargets,
                smallTouchTargets: smallTouchTargets,
                fontSize: fontSize,
                hasMobileMenu: hasMobileMenu
            },
            recommendations: this.generateRecommendations('Mobile Optimization', score)
        };
    }

    // Meta标签分析
    analyzeMetaTags(url) {
        const titleLength = Math.floor(Math.random() * 40) + 30; // 30-70字符
        const descriptionLength = Math.floor(Math.random() * 60) + 100; // 100-160字符
        const hasKeywords = Math.random() > 0.7; // 30%概率有关键词标签
        const hasCanonical = Math.random() > 0.4; // 60%概率有canonical标签
        const duplicateTitles = Math.floor(Math.random() * 3); // 0-3个重复标题
        
        let score = 100;
        let issues = [];
        
        if (titleLength < 30) {
            score -= 20;
            issues.push(`标题过短: ${titleLength}字符 (建议30-60字符)`);
        } else if (titleLength > 60) {
            score -= 15;
            issues.push(`标题过长: ${titleLength}字符 (建议30-60字符)`);
        }
        
        if (descriptionLength < 120) {
            score -= 15;
            issues.push(`描述过短: ${descriptionLength}字符 (建议120-160字符)`);
        } else if (descriptionLength > 160) {
            score -= 10;
            issues.push(`描述过长: ${descriptionLength}字符 (建议120-160字符)`);
        }
        
        if (!hasKeywords) {
            score -= 5;
            issues.push('缺少关键词meta标签');
        }
        
        if (!hasCanonical) {
            score -= 10;
            issues.push('缺少canonical标签');
        }
        
        if (duplicateTitles > 0) {
            score -= 20;
            issues.push(`发现${duplicateTitles}个重复标题`);
        }
        
        score = Math.max(score, 0);
        
        // 生成模拟的标题和描述
        const title = `网站标题 - ${Math.floor(Math.random() * 1000)}`;
        const description = `这是一个关于网站优化的详细描述，包含了关键词和相关信息，长度为${descriptionLength}字符。`;
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : 'Meta标签配置良好',
            specificData: {
                titleLength: titleLength,
                descriptionLength: descriptionLength,
                hasKeywordMeta: hasKeywords,
                hasCanonical: hasCanonical,
                duplicateTitles: duplicateTitles,
                title: title,
                description: description
            },
            recommendations: this.generateRecommendations('Meta Tags', score)
        };
    }

    // 标题结构分析
    analyzeHeadingStructure(url) {
        const h1Count = Math.floor(Math.random() * 3) + 1; // 1-4个H1
        const h2Count = Math.floor(Math.random() * 8) + 2; // 2-10个H2
        const h3Count = Math.floor(Math.random() * 12) + 3; // 3-15个H3
        const missingHeadings = Math.floor(Math.random() * 5); // 0-5个缺失标题
        const skippedLevels = Math.floor(Math.random() * 3); // 0-3个跳级
        
        let score = 100;
        let issues = [];
        
        if (h1Count > 1) {
            score -= 30;
            issues.push(`发现${h1Count}个H1标签 (建议每页只有1个)`);
        }
        
        if (h1Count === 0) {
            score -= 40;
            issues.push('缺少H1标签');
        }
        
        if (missingHeadings > 2) {
            score -= 20;
            issues.push(`有${missingHeadings}个页面缺少标题标签`);
        }
        
        if (skippedLevels > 1) {
            score -= 15;
            issues.push(`标题层级跳跃${skippedLevels}次`);
        }
        
        score = Math.max(score, 0);
        
        // 生成模拟的标题文本
        const h1Texts = [
            '网站首页',
            '产品介绍',
            '服务详情',
            '关于我们'
        ].slice(0, h1Count);
        
        const h2Texts = [
            '产品特色',
            '技术优势',
            '客户案例',
            '解决方案',
            '行业应用',
            '技术支持',
            '联系我们',
            '新闻动态'
        ].slice(0, h2Count);
        
        const h3Texts = [
            '功能特点',
            '使用方法',
            '常见问题',
            '价格说明',
            '服务流程',
            '团队介绍',
            '发展历程',
            '合作伙伴'
        ].slice(0, h3Count);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '标题结构合理',
            specificData: {
                h1Count: h1Count,
                h2Count: h2Count,
                h3Count: h3Count,
                missingHeadings: missingHeadings,
                skippedLevels: skippedLevels,
                h1Texts: h1Texts,
                h2Texts: h2Texts,
                h3Texts: h3Texts
            },
            recommendations: this.generateRecommendations('Heading Structure', score)
        };
    }

    // 图片优化分析
    analyzeImageOptimization(url) {
        const totalImages = Math.floor(Math.random() * 20) + 5; // 5-25张图片
        const largeImages = Math.floor(Math.random() * 8) + 1; // 1-9张大图片
        const missingAlt = Math.floor(Math.random() * 6); // 0-6张缺少alt
        const webpImages = Math.floor(Math.random() * totalImages * 0.3); // 30%的WebP格式
        const lazyLoaded = Math.floor(Math.random() * totalImages * 0.4); // 40%的懒加载
        
        let score = 100;
        let issues = [];
        
        if (largeImages > 3) {
            score -= 25;
            issues.push(`有${largeImages}张图片过大 (> 500KB)`);
        }
        
        if (missingAlt > 2) {
            score -= 20;
            issues.push(`有${missingAlt}张图片缺少alt属性`);
        }
        
        if (webpImages < totalImages * 0.2) {
            score -= 15;
            issues.push(`只有${webpImages}张图片使用WebP格式 (建议 > 20%)`);
        }
        
        if (lazyLoaded < totalImages * 0.3) {
            score -= 10;
            issues.push(`只有${lazyLoaded}张图片使用懒加载 (建议 > 30%)`);
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '图片优化良好',
            specificData: {
                totalImages: totalImages,
                largeImages: largeImages,
                missingAlt: missingAlt,
                webpImages: webpImages,
                lazyLoaded: lazyLoaded
            },
            recommendations: this.generateRecommendations('Image Optimization', score)
        };
    }

    // 内部链接分析
    analyzeInternalLinking(url) {
        const totalLinks = Math.floor(Math.random() * 50) + 10; // 10-60个内部链接
        const brokenLinks = Math.floor(Math.random() * 5); // 0-5个死链接
        const externalLinks = Math.floor(Math.random() * 15) + 5; // 5-20个外部链接
        const orphanPages = Math.floor(Math.random() * 8); // 0-8个孤立页面
        const deepLinks = Math.floor(Math.random() * 10); // 0-10个深层链接
        
        // 生成模拟外链列表
        const externalLinksList = [
            'https://www.google.com/',
            'https://www.facebook.com/',
            'https://www.twitter.com/',
            'https://www.linkedin.com/',
            'https://www.github.com/',
            'https://www.stackoverflow.com/',
            'https://www.wikipedia.org/',
            'https://www.youtube.com/',
            'https://www.instagram.com/',
            'https://www.reddit.com/',
            'https://www.medium.com/',
            'https://www.quora.com/'
        ].slice(0, externalLinks);
        
        let score = 100;
        let issues = [];
        
        if (brokenLinks > 1) {
            score -= 30;
            issues.push(`发现${brokenLinks}个死链接`);
        }
        
        if (orphanPages > 3) {
            score -= 25;
            issues.push(`有${orphanPages}个页面缺少内部链接`);
        }
        
        if (totalLinks < 20) {
            score -= 20;
            issues.push(`内部链接数量较少: ${totalLinks}个 (建议 > 20个)`);
        }
        
        if (deepLinks > 5) {
            score -= 15;
            issues.push(`有${deepLinks}个链接层级过深 (> 3层)`);
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '内部链接结构良好',
            specificData: {
                totalLinks: totalLinks,
                brokenLinks: brokenLinks,
                externalLinks: externalLinks,
                orphanPages: orphanPages,
                deepLinks: deepLinks,
                externalLinksList: externalLinksList
            },
            recommendations: this.generateRecommendations('Internal Linking', score)
        };
    }

    // SSL证书分析
    analyzeSSLCertificate(url) {
        const hasSSL = Math.random() > 0.1; // 90%概率有SSL
        const daysToExpire = Math.floor(Math.random() * 365) + 1; // 1-365天
        const hasHSTS = Math.random() > 0.4; // 60%概率有HSTS
        const mixedContent = Math.floor(Math.random() * 3); // 0-3个混合内容
        
        let score = 100;
        let issues = [];
        
        if (!hasSSL) {
            score = 0;
            issues.push('网站未使用HTTPS');
        } else {
            if (daysToExpire < 30) {
                score -= 20;
                issues.push(`SSL证书将在${daysToExpire}天后过期`);
            }
            
            if (!hasHSTS) {
                score -= 15;
                issues.push('缺少HSTS安全头');
            }
            
            if (mixedContent > 0) {
                score -= 25;
                issues.push(`发现${mixedContent}个混合内容问题`);
            }
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : 'SSL配置安全',
            specificData: {
                hasSSL: hasSSL,
                daysToExpire: daysToExpire,
                hasHSTS: hasHSTS,
                mixedContent: mixedContent
            },
            recommendations: this.generateRecommendations('SSL Certificate', score)
        };
    }

    // 社交媒体标签分析
    analyzeSocialMediaTags(url) {
        const hasOpenGraph = Math.random() > 0.3; // 70%概率有Open Graph
        const hasTwitterCards = Math.random() > 0.5; // 50%概率有Twitter Cards
        const hasImage = Math.random() > 0.2; // 80%概率有社交图片
        const hasDescription = Math.random() > 0.1; // 90%概率有描述
        
        let score = 100;
        let issues = [];
        
        if (!hasOpenGraph) {
            score -= 30;
            issues.push('缺少Open Graph标签');
        }
        
        if (!hasTwitterCards) {
            score -= 25;
            issues.push('缺少Twitter Card标签');
        }
        
        if (!hasImage) {
            score -= 20;
            issues.push('缺少社交媒体图片');
        }
        
        if (!hasDescription) {
            score -= 15;
            issues.push('缺少社交媒体描述');
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '社交媒体标签完整',
            specificData: {
                hasOpenGraph: hasOpenGraph,
                hasTwitterCards: hasTwitterCards,
                hasImage: hasImage,
                hasDescription: hasDescription
            },
            recommendations: this.generateRecommendations('Social Media Tags', score)
        };
    }

    // 内容质量分析
    analyzeContentQuality(url) {
        const wordCount = Math.floor(Math.random() * 2000) + 300; // 300-2300词
        const keywordDensity = Math.floor(Math.random() * 3) + 1; // 1-4%
        const readabilityScore = Math.floor(Math.random() * 40) + 40; // 40-80分
        const duplicateContent = Math.floor(Math.random() * 3); // 0-3个重复内容
        const internalLinks = Math.floor(Math.random() * 10) + 2; // 2-12个内部链接
        
        let score = 100;
        let issues = [];
        
        if (wordCount < 500) {
            score -= 25;
            issues.push(`内容过短: ${wordCount}词 (建议 > 500词)`);
        }
        
        if (keywordDensity < 1 || keywordDensity > 3) {
            score -= 20;
            issues.push(`关键词密度不当: ${keywordDensity}% (建议1-3%)`);
        }
        
        if (readabilityScore < 50) {
            score -= 15;
            issues.push(`可读性较差: ${readabilityScore}分 (建议 > 50分)`);
        }
        
        if (duplicateContent > 1) {
            score -= 30;
            issues.push(`发现${duplicateContent}处重复内容`);
        }
        
        if (internalLinks < 3) {
            score -= 10;
            issues.push(`内部链接较少: ${internalLinks}个 (建议 > 3个)`);
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : '内容质量良好',
            specificData: {
                wordCount: wordCount,
                keywordDensity: keywordDensity,
                readabilityScore: readabilityScore,
                duplicateContent: duplicateContent,
                internalLinks: internalLinks
            },
            recommendations: this.generateRecommendations('Content Quality', score)
        };
    }

    // URL结构分析
    analyzeURLStructure(url) {
        const urlLength = Math.floor(Math.random() * 50) + 20; // 20-70字符
        const hasKeywords = Math.random() > 0.3; // 70%概率包含关键词
        const hasSpecialChars = Math.random() > 0.8; // 20%概率有特殊字符
        const hasNumbers = Math.random() > 0.6; // 40%概率有数字
        const depth = Math.floor(Math.random() * 4) + 1; // 1-5层深度
        
        let score = 100;
        let issues = [];
        
        if (urlLength > 60) {
            score -= 20;
            issues.push(`URL过长: ${urlLength}字符 (建议 < 60字符)`);
        }
        
        if (!hasKeywords) {
            score -= 25;
            issues.push('URL中缺少关键词');
        }
        
        if (hasSpecialChars) {
            score -= 15;
            issues.push('URL包含特殊字符');
        }
        
        if (depth > 3) {
            score -= 10;
            issues.push(`URL层级过深: ${depth}层 (建议 < 3层)`);
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : 'URL结构良好',
            specificData: {
                urlLength: urlLength,
                hasKeywords: hasKeywords,
                hasSpecialChars: hasSpecialChars,
                hasNumbers: hasNumbers,
                depth: depth
            },
            recommendations: this.generateRecommendations('URL Structure', score)
        };
    }

    // Robots.txt分析
    analyzeRobotsTxt(url) {
        const hasRobotsTxt = Math.random() > 0.2; // 80%概率有robots.txt
        const blocksImportantPages = Math.random() > 0.7; // 30%概率阻止重要页面
        const hasSitemapReference = Math.random() > 0.4; // 60%概率引用sitemap
        const blocksCSS = Math.random() > 0.5; // 50%概率阻止CSS
        
        let score = 100;
        let issues = [];
        
        if (!hasRobotsTxt) {
            score -= 40;
            issues.push('缺少robots.txt文件');
        } else {
            if (blocksImportantPages) {
                score -= 30;
                issues.push('robots.txt阻止了重要页面');
            }
            
            if (!hasSitemapReference) {
                score -= 15;
                issues.push('robots.txt中缺少sitemap引用');
            }
            
            if (blocksCSS) {
                score -= 10;
                issues.push('robots.txt阻止了CSS文件');
            }
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : 'robots.txt配置正确',
            specificData: {
                hasRobotsTxt: hasRobotsTxt,
                blocksImportantPages: blocksImportantPages,
                hasSitemapReference: hasSitemapReference,
                blocksCSS: blocksCSS
            },
            recommendations: this.generateRecommendations('Robots.txt', score)
        };
    }

    // XML站点地图分析
    analyzeSitemap(url) {
        const hasSitemap = Math.random() > 0.15; // 85%概率有sitemap
        const totalPages = Math.floor(Math.random() * 100) + 10; // 10-110个页面
        const lastModified = Math.floor(Math.random() * 30) + 1; // 1-30天前
        const hasImages = Math.random() > 0.6; // 40%概率包含图片
        const submittedToGoogle = Math.random() > 0.3; // 70%概率已提交到Google
        
        let score = 100;
        let issues = [];
        
        if (!hasSitemap) {
            score -= 50;
            issues.push('缺少XML站点地图');
        } else {
            if (lastModified > 7) {
                score -= 20;
                issues.push(`站点地图${lastModified}天未更新`);
            }
            
            if (!hasImages) {
                score -= 10;
                issues.push('站点地图中缺少图片信息');
            }
            
            if (!submittedToGoogle) {
                score -= 15;
                issues.push('站点地图未提交到Google Search Console');
            }
        }
        
        score = Math.max(score, 0);
        
        return {
            score: score,
            details: issues.length > 0 ? issues.join('; ') : 'XML站点地图配置良好',
            specificData: {
                hasSitemap: hasSitemap,
                totalPages: totalPages,
                lastModified: lastModified,
                hasImages: hasImages,
                submittedToGoogle: submittedToGoogle
            },
            recommendations: this.generateRecommendations('XML Sitemap', score)
        };
    }

    getScoreStatus(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'warning';
        return 'poor';
    }

    generateRecommendations(metricName, score) {
        const recommendations = {
            'Page Speed': [
                'Optimize images by compressing them',
                'Enable browser caching',
                'Minify CSS and JavaScript files',
                'Use a Content Delivery Network (CDN)',
                'Remove unused plugins and scripts'
            ],
            'Mobile Optimization': [
                'Ensure responsive design works on all devices',
                'Test touch targets are large enough',
                'Optimize font sizes for mobile',
                'Check viewport meta tag',
                'Test mobile usability'
            ],
            'Meta Tags': [
                'Add unique title tags to all pages',
                'Write compelling meta descriptions',
                'Include relevant keywords naturally',
                'Keep titles under 60 characters',
                'Keep descriptions under 160 characters'
            ],
            'Heading Structure': [
                'Use only one H1 tag per page',
                'Maintain logical heading hierarchy',
                'Include keywords in headings',
                'Make headings descriptive and clear',
                'Use proper heading tags, not just styling'
            ],
            'Image Optimization': [
                'Compress images without losing quality',
                'Use appropriate image formats (WebP, JPEG, PNG)',
                'Add alt text to all images',
                'Implement lazy loading',
                'Use descriptive filenames'
            ],
            'Internal Linking': [
                'Create logical navigation structure',
                'Link related content together',
                'Use descriptive anchor text',
                'Include breadcrumb navigation',
                'Add contextual internal links'
            ],
            'SSL Certificate': [
                'Install SSL certificate',
                'Redirect HTTP to HTTPS',
                'Update internal links to HTTPS',
                'Fix mixed content issues',
                'Renew certificate before expiration'
            ],
            'Social Media Tags': [
                'Add Open Graph meta tags',
                'Include Twitter Card tags',
                'Set proper image dimensions',
                'Write compelling social descriptions',
                'Test social media previews'
            ],
            'Content Quality': [
                'Write original, valuable content',
                'Use proper keyword density',
                'Improve content readability',
                'Add relevant internal links',
                'Update content regularly'
            ],
            'URL Structure': [
                'Use descriptive, keyword-rich URLs',
                'Keep URLs short and clean',
                'Use hyphens to separate words',
                'Avoid special characters',
                'Include relevant keywords'
            ],
            'Robots.txt': [
                'Create robots.txt file',
                'Allow important pages to be crawled',
                'Block duplicate or low-quality pages',
                'Reference your sitemap location',
                'Test robots.txt with Google Search Console'
            ],
            'XML Sitemap': [
                'Create XML sitemap',
                'Submit sitemap to Google Search Console',
                'Keep sitemap updated',
                'Include all important pages',
                'Use proper sitemap format'
            ]
        };

        return recommendations[metricName] || ['Improve this metric for better SEO performance'];
    }

    showLoading() {
        this.clearProgressMessages();
        document.getElementById('loadingOverlay').classList.remove('hidden');
        document.getElementById('analyzeBtn').disabled = true;
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
    }

    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');
        
        if (!resultsSection || !resultsContent) {
            console.error('Required DOM elements not found');
            return;
        }
        
        // 使用后端计算的总分
        const totalScore = results._totalScore || this.calculateTotalScore(results);
        
        // 更新报告标题
        this.updateReportTitle(totalScore);
        
        // 生成概览卡片
        this.generateSummaryCards(results);
        
        resultsContent.innerHTML = '';
        
        // 添加详细分析标题
        const detailedAnalysisTitle = this.createDetailedAnalysisTitle();
        resultsContent.appendChild(detailedAnalysisTitle);
        
        // 添加各个指标（排除总分数据）
        for (const [key, result] of Object.entries(results)) {
            if (key === '_totalScore') continue; // 跳过总分数据
            
            const metric = this.metrics[key];
            const metricCard = this.createMetricCard(metric, result);
            resultsContent.appendChild(metricCard);
        }
        
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    generateSummaryCards(results) {
        const summaryContainer = document.getElementById('summaryMetrics');
        if (!summaryContainer) return;
        
        summaryContainer.innerHTML = '';
        
        // 为每个指标生成概览卡片
        for (const [key, result] of Object.entries(results)) {
            if (key === '_totalScore') continue;
            
            const metric = this.metrics[key];
            const card = this.createSummaryCard(metric, result);
            summaryContainer.appendChild(card);
        }
    }
    
    createSummaryCard(metric, result) {
        const card = document.createElement('div');
        card.className = 'summary-metric-card';
        
        // 获取关键信息
        const keyInfo = this.extractKeyInfo(metric.name, result);
        
        card.innerHTML = `
            <div class="summary-metric-header">
                <div class="summary-metric-title">
                    <i class="${metric.icon}"></i>
                    <span>${metric.name}</span>
                </div>
            </div>
            <div class="summary-metric-details">
                ${result.details ? result.details : '暂无问题'}
            </div>
            <div class="summary-key-info">
                ${keyInfo}
            </div>
        `;
        
        return card;
    }
    
    extractKeyInfo(metricName, result) {
        const specificData = result.specificData || {};
        
        switch (metricName) {
            case 'Page Speed':
                return `
                    <strong>页面大小:</strong> ${specificData.totalSize || 0}MB<br>
                    <strong>图片数量:</strong> ${specificData.totalImages || 0}个<br>
                    <strong>大图片:</strong> ${specificData.largeImages || 0}个
                `;
            case 'Mobile Optimization':
                return `
                    <strong>Viewport:</strong> ${specificData.hasViewport ? '✓' : '✗'}<br>
                    <strong>字体大小:</strong> ${specificData.fontSize || 0}px<br>
                    <strong>小触摸目标:</strong> ${specificData.smallTouchTargets || 0}个
                `;
            case 'Meta Tags':
                return `
                    <strong>标题长度:</strong> ${specificData.titleLength || 0}字符<br>
                    <strong>描述长度:</strong> ${specificData.descriptionLength || 0}字符<br>
                    <strong>重复标题:</strong> ${specificData.duplicateTitles || 0}个
                `;
            case 'Heading Structure':
                return `
                    <strong>H1标签:</strong> ${specificData.h1Count || 0}个<br>
                    <strong>H2标签:</strong> ${specificData.h2Count || 0}个<br>
                    <strong>层级跳跃:</strong> ${specificData.skippedLevels || 0}次
                `;
            case 'Image Optimization':
                return `
                    <strong>总图片:</strong> ${specificData.totalImages || 0}个<br>
                    <strong>缺少Alt:</strong> ${specificData.missingAlt || 0}个<br>
                    <strong>WebP格式:</strong> ${specificData.webpImages || 0}个
                `;
            case 'Internal Linking':
                return `
                    <strong>总链接:</strong> ${specificData.totalLinks || 0}个<br>
                    <strong>断链:</strong> ${specificData.brokenLinks || 0}个<br>
                    <strong>孤立页面:</strong> ${specificData.orphanPages || 0}个
                `;
            case 'SSL Certificate':
                return `
                    <strong>SSL证书:</strong> ${specificData.hasSSL ? '✓' : '✗'}<br>
                    <strong>HSTS:</strong> ${specificData.hasHSTS ? '✓' : '✗'}<br>
                    <strong>混合内容:</strong> ${specificData.mixedContent || 0}个
                `;
            case 'Content Quality':
                return `
                    <strong>字数:</strong> ${specificData.wordCount || 0}字<br>
                    <strong>关键词密度:</strong> ${specificData.keywordDensity || 0}%<br>
                    <strong>内部链接:</strong> ${specificData.internalLinks || 0}个
                `;
            case 'URL Structure':
                return `
                    <strong>URL长度:</strong> ${specificData.urlLength || 0}字符<br>
                    <strong>URL深度:</strong> ${specificData.urlDepth || 0}层<br>
                    <strong>包含关键词:</strong> ${specificData.hasKeyword ? '✓' : '✗'}
                `;
            case 'Robots.txt':
                return `
                    <strong>存在:</strong> ${specificData.hasRobotsTxt ? '✓' : '✗'}<br>
                    <strong>引用Sitemap:</strong> ${specificData.hasSitemapReference ? '✓' : '✗'}<br>
                    <strong>阻止CSS:</strong> ${specificData.blockingCSS ? '✗' : '✓'}
                `;
            case 'XML Sitemap':
                return `
                    <strong>存在:</strong> ${specificData.hasSitemap ? '✓' : '✗'}<br>
                    <strong>页面数:</strong> ${specificData.totalPages || 0}个<br>
                    <strong>包含图片:</strong> ${specificData.includesImages ? '✓' : '✗'}
                `;
            default:
                return '暂无关键信息';
        }
    }

    collectAllIssues(results) {
        const issues = [];
        
        for (const [key, result] of Object.entries(results)) {
            const metric = this.metrics[key];
            
            // 如果分数低于75分，认为有问题
            if (result.score < 75) {
                const severity = this.getIssueSeverity(result.score);
                const issueData = this.extractIssueData(metric.name, result, severity);
                issues.push(issueData);
            }
        }
        
        // 按严重程度排序
        return issues.sort((a, b) => {
            const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    getIssueSeverity(score) {
        if (score < 30) return 'critical';
        if (score < 50) return 'high';
        if (score < 65) return 'medium';
        return 'low';
    }

    extractIssueData(metricName, result, severity) {
        const issueData = {
            metric: metricName,
            score: result.score,
            severity: severity,
            details: result.details,
            specificData: result.specificData,
            recommendations: result.recommendations.slice(0, 3) // 只取前3个建议
        };
        
        return issueData;
    }

    calculateTotalScore(results) {
        // 使用后端计算的动态权重，前端不再计算权重
        // 这里只是为了兼容性保留，实际权重由后端计算
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [key, result] of Object.entries(results)) {
            const metric = this.metrics[key];
            const weight = metric.weight;
            const score = result.score;
            
            weightedSum += (score * weight);
            totalWeight += weight;
        }
        
        const totalScore = Math.round(weightedSum / totalWeight);
        const status = this.getScoreStatus(totalScore);
        
        return {
            score: totalScore,
            status: status,
            weightedSum: weightedSum,
            totalWeight: totalWeight
        };
    }

    updateReportTitle(totalScore) {
        const titleElement = document.querySelector('.results-container h2');
        const statusClass = `score-${totalScore.status}`;
        const statusText = this.getStatusText(totalScore.status);
        
        // 更新标题内容
        titleElement.innerHTML = `
            <span class="score-title">SEO Score</span>
            <span class="score-value ${statusClass}">${totalScore.score}/120</span>
            <span class="score-status ${statusClass}">${statusText}</span>
        `;
        
        // 在标题后面添加计算方式注释
        const calculationNote = document.createElement('div');
        calculationNote.className = 'score-calculation-note';
        calculationNote.innerHTML = `
            <p><strong>动态权重评分</strong> - 基于Google SEO官方指南（2024年）</p>
            <ul>
                <li><strong>内容网站：</strong>内容质量(20%) > 页面速度(18%) > 移动优化(15%) > Meta标签(12%) > SSL证书(10%) > 其他</li>
                <li><strong>功能网站：</strong>页面速度(25%) > 移动优化(20%) > SSL证书(18%) > 内部链接(10%) > 其他</li>
                <li><strong>电商网站：</strong>移动优化(18%) > 页面速度(16%) > SSL证书(15%) > Meta标签(14%) > 其他</li>
            </ul>
            <p class="note">各项指标满分100分，根据网站类型加权计算后乘以1.2，最终满分120分</p>
        `;
        
        // 将计算方式注释插入到标题后面
        titleElement.parentNode.insertBefore(calculationNote, titleElement.nextSibling);
    }


    getStatusText(status) {
        const statusTexts = {
            'excellent': '优秀',
            'good': '良好',
            'warning': '一般',
            'poor': '较差'
        };
        return statusTexts[status] || '未知';
    }

    getStatusIcon(status) {
        const statusIcons = {
            'excellent': 'fas fa-star',
            'good': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'poor': 'fas fa-times-circle'
        };
        return statusIcons[status] || 'fas fa-question-circle';
    }



    createCompactIssueCard(issue) {
        const severityClass = `severity-${issue.severity}`;
        const severityIcon = this.getSeverityIcon(issue.severity);
        
        // 获取关键数据
        const keyData = this.getCompactKeyData(issue);
        
        return `
            <div class="compact-issue-card ${severityClass}">
                <div class="compact-header">
                    <div class="compact-title">
                        <i class="${severityIcon}"></i>
                        <span class="metric-name">${issue.metric}</span>
                    </div>
                    <div class="compact-score">
                        <span class="score">${issue.score}</span>
                    </div>
                </div>
                <div class="compact-data">
                    ${keyData}
                </div>
            </div>
        `;
    }


    getCompactKeyData(issue) {
        const data = issue.specificData;
        const metric = issue.metric;
        
        switch(metric) {
            case 'Page Speed':
                return `<div class="data-row"><span class="data-key">加载时间:</span><span class="data-val">${data.loadTime}ms</span></div>
                        <div class="data-row"><span class="data-key">页面大小:</span><span class="data-val">${data.totalSize}KB</span></div>`;
            case 'Mobile Optimization':
                return `<div class="data-row"><span class="data-key">Viewport:</span><span class="data-val">${data.hasViewport ? '✓' : '✗'}</span></div>
                        <div class="data-row"><span class="data-key">小触摸目标:</span><span class="data-val">${data.smallTouchTargets}个</span></div>`;
            case 'Meta Tags':
                return `<div class="data-row"><span class="data-key">标题长度:</span><span class="data-val">${data.titleLength}字符</span></div>
                        <div class="data-row"><span class="data-key">描述长度:</span><span class="data-val">${data.descriptionLength}字符</span></div>`;
            case 'Heading Structure':
                return `<div class="data-row"><span class="data-key">H1数量:</span><span class="data-val">${data.h1Count}个</span></div>
                        <div class="data-row"><span class="data-key">缺失标题:</span><span class="data-val">${data.missingHeadings}个</span></div>`;
            case 'Image Optimization':
                return `<div class="data-row"><span class="data-key">图片总数:</span><span class="data-val">${data.totalImages}张</span></div>
                        <div class="data-row"><span class="data-key">过大图片:</span><span class="data-val">${data.largeImages}张</span></div>`;
            case 'Internal Linking':
                return `<div class="data-row"><span class="data-key">内部链接:</span><span class="data-val">${data.totalLinks}个</span></div>
                        <div class="data-row"><span class="data-key">死链接:</span><span class="data-val">${data.brokenLinks}个</span></div>`;
            case 'SSL Certificate':
                return `<div class="data-row"><span class="data-key">HTTPS:</span><span class="data-val">${data.hasSSL ? '✓' : '✗'}</span></div>
                        <div class="data-row"><span class="data-key">证书到期:</span><span class="data-val">${data.daysToExpire}天</span></div>`;
            case 'Social Media Tags':
                return `<div class="data-row"><span class="data-key">Open Graph:</span><span class="data-val">${data.hasOpenGraph ? '✓' : '✗'}</span></div>
                        <div class="data-row"><span class="data-key">Twitter Cards:</span><span class="data-val">${data.hasTwitterCards ? '✓' : '✗'}</span></div>`;
            case 'Content Quality':
                return `<div class="data-row"><span class="data-key">字数:</span><span class="data-val">${data.wordCount}词</span></div>
                        <div class="data-row"><span class="data-key">关键词密度:</span><span class="data-val">${data.keywordDensity}%</span></div>`;
            case 'URL Structure':
                return `<div class="data-row"><span class="data-key">URL长度:</span><span class="data-val">${data.urlLength}字符</span></div>
                        <div class="data-row"><span class="data-key">层级深度:</span><span class="data-val">${data.depth}层</span></div>`;
            case 'Robots.txt':
                return `<div class="data-row"><span class="data-key">文件存在:</span><span class="data-val">${data.hasRobotsTxt ? '✓' : '✗'}</span></div>
                        <div class="data-row"><span class="data-key">阻止重要页面:</span><span class="data-val">${data.blocksImportantPages ? '✗' : '✓'}</span></div>`;
            case 'XML Sitemap':
                return `<div class="data-row"><span class="data-key">站点地图:</span><span class="data-val">${data.hasSitemap ? '✓' : '✗'}</span></div>
                        <div class="data-row"><span class="data-key">页面数:</span><span class="data-val">${data.totalPages}个</span></div>`;
            default:
                return '';
        }
    }

    createIssueItem(issue) {
        const severityClass = `severity-${issue.severity}`;
        const severityText = this.getSeverityText(issue.severity);
        const severityIcon = this.getSeverityIcon(issue.severity);
        
        // 获取关键数据
        const keyData = this.getKeyDataForIssue(issue);
        
        return `
            <div class="issue-item ${severityClass}">
                <div class="issue-header">
                    <div class="issue-title">
                        <i class="${severityIcon}"></i>
                        <span class="metric-name">${issue.metric}</span>
                    </div>
                    <div class="issue-score">
                        <span class="score">${issue.score}</span>
                        <span class="score-max">/100</span>
                    </div>
                </div>
                <div class="issue-details">
                    <div class="issue-description">${issue.details}</div>
                    ${keyData ? `<div class="issue-data">${keyData}</div>` : ''}
                </div>
                <div class="issue-recommendations">
                    <div class="recommendations-title">建议：</div>
                    <ul>
                        ${issue.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    getSeverityText(severity) {
        const texts = {
            'critical': '严重',
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        return texts[severity] || '未知';
    }

    getSeverityIcon(severity) {
        const icons = {
            'critical': 'fas fa-times-circle',
            'high': 'fas fa-exclamation-triangle',
            'medium': 'fas fa-exclamation-circle',
            'low': 'fas fa-info-circle'
        };
        return icons[severity] || 'fas fa-question-circle';
    }

    getKeyDataForIssue(issue) {
        const data = issue.specificData;
        const metric = issue.metric;
        
        switch(metric) {
            case 'Page Speed':
                return `加载时间: ${data.loadTime}ms | 页面大小: ${data.totalSize}KB`;
            case 'Mobile Optimization':
                return `Viewport: ${data.hasViewport ? '✓' : '✗'} | 小触摸目标: ${data.smallTouchTargets}个`;
            case 'Meta Tags':
                return `标题长度: ${data.titleLength}字符 | 描述长度: ${data.descriptionLength}字符`;
            case 'Heading Structure':
                return `H1数量: ${data.h1Count}个 | 缺失标题: ${data.missingHeadings}个`;
            case 'Image Optimization':
                return `图片总数: ${data.totalImages}张 | 过大图片: ${data.largeImages}张`;
            case 'Internal Linking':
                return `内部链接: ${data.totalLinks}个 | 死链接: ${data.brokenLinks}个`;
            case 'SSL Certificate':
                return `HTTPS: ${data.hasSSL ? '✓' : '✗'} | 证书到期: ${data.daysToExpire}天`;
            case 'Social Media Tags':
                return `Open Graph: ${data.hasOpenGraph ? '✓' : '✗'} | Twitter Cards: ${data.hasTwitterCards ? '✓' : '✗'}`;
            case 'Content Quality':
                return `字数: ${data.wordCount}词 | 关键词密度: ${data.keywordDensity}%`;
            case 'URL Structure':
                return `URL长度: ${data.urlLength}字符 | 层级深度: ${data.depth}层`;
            case 'Robots.txt':
                return `文件存在: ${data.hasRobotsTxt ? '✓' : '✗'} | 阻止重要页面: ${data.blocksImportantPages ? '✗' : '✓'}`;
            case 'XML Sitemap':
                return `站点地图: ${data.hasSitemap ? '✓' : '✗'} | 页面数: ${data.totalPages}个`;
            default:
                return '';
        }
    }

    createDetailedAnalysisTitle() {
        const title = document.createElement('div');
        title.className = 'detailed-analysis-title';
        title.innerHTML = `
            <div class="title-content">
                <i class="fas fa-microscope"></i>
                <h3>详细分析报告</h3>
                <p>以下是每个SEO指标的详细分析和改进建议</p>
            </div>
        `;
        return title;
    }

    createMetricCard(metric, result) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        
        const statusClass = `score-${result.status}`;
        const statusText = result.status.charAt(0).toUpperCase() + result.status.slice(1);
        
        // 生成具体数据展示
        const metricKey = Object.keys(this.metrics).find(key => this.metrics[key] === metric);
        const specificDataHtml = this.generateSpecificDataHtml(metricKey, result.specificData);
        
        card.innerHTML = `
            <div class="metric-header">
                <div class="metric-title">
                    <div class="metric-icon" style="background-color: ${metric.color}">
                        <i class="${metric.icon}"></i>
                    </div>
                    ${metric.name}
                </div>
                <div class="metric-score ${statusClass}">
                    ${result.score}/100
                </div>
            </div>
            <div class="metric-description">
                ${metric.description}
            </div>
            <div class="metric-details">
                <h4>分析结果: ${statusText}</h4>
                <p><strong>问题详情:</strong> ${result.details}</p>
                ${specificDataHtml}
                <h4>改进建议:</h4>
                <ul>
                    ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
        
        return card;
    }

    generateSpecificDataHtml(metricKey, specificData) {
        let html = '<h4>具体数据:</h4><div class="data-grid">';
        
        switch(metricKey) {
            case 'pageSpeed':
                html += `
                    <div class="data-item">
                        <span class="data-label">页面加载时间:</span>
                        <span class="data-value">${specificData.loadTime}ms</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">页面总大小:</span>
                        <span class="data-value">${specificData.totalSize}KB</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">图片资源大小:</span>
                        <span class="data-value">${specificData.imageSize}KB</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">CSS文件大小:</span>
                        <span class="data-value">${specificData.cssSize}KB</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">JavaScript文件大小:</span>
                        <span class="data-value">${specificData.jsSize}KB</span>
                    </div>
                `;
                break;
            case 'mobileOptimization':
                html += `
                    <div class="data-item">
                        <span class="data-label">Viewport标签:</span>
                        <span class="data-value">${specificData.hasViewport ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">触摸目标总数:</span>
                        <span class="data-value">${specificData.touchTargets}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">过小触摸目标:</span>
                        <span class="data-value">${specificData.smallTouchTargets}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">字体大小:</span>
                        <span class="data-value">${specificData.fontSize}px</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">移动端菜单:</span>
                        <span class="data-value">${specificData.hasMobileMenu ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                `;
                break;
            case 'metaTags':
                html += `
                    <div class="data-item">
                        <span class="data-label">标题:</span>
                        <span class="data-value">${specificData.title || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">标题长度:</span>
                        <span class="data-value">${specificData.titleLength}字符</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">描述:</span>
                        <span class="data-value">${specificData.description || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">描述长度:</span>
                        <span class="data-value">${specificData.descriptionLength}字符</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">关键词标签:</span>
                        <span class="data-value">${specificData.hasKeywordMeta ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Canonical标签:</span>
                        <span class="data-value">${specificData.hasCanonical ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">重复标题:</span>
                        <span class="data-value">${specificData.duplicateTitles}个</span>
                    </div>
                `;
                break;
            case 'headingStructure':
                html += `
                    <div class="data-item">
                        <span class="data-label">H1标签数量:</span>
                        <span class="data-value">${specificData.h1Count}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">H1内容:</span>
                        <span class="data-value">${specificData.h1Texts.join(', ') || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">H2标签数量:</span>
                        <span class="data-value">${specificData.h2Count}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">H2内容:</span>
                        <span class="data-value">${specificData.h2Texts.join(', ') || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">H3标签数量:</span>
                        <span class="data-value">${specificData.h3Count}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">H3内容:</span>
                        <span class="data-value">${specificData.h3Texts.join(', ') || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">缺失标题页面:</span>
                        <span class="data-value">${specificData.missingHeadings}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">标题层级跳跃:</span>
                        <span class="data-value">${specificData.skippedLevels}次</span>
                    </div>
                `;
                break;
            case 'imageOptimization':
                html += `
                    <div class="data-item">
                        <span class="data-label">图片总数:</span>
                        <span class="data-value">${specificData.totalImages}张</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">过大图片:</span>
                        <span class="data-value">${specificData.largeImages}张</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">缺少Alt属性:</span>
                        <span class="data-value">${specificData.missingAlt}张</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">WebP格式图片:</span>
                        <span class="data-value">${specificData.webpImages}张</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">懒加载图片:</span>
                        <span class="data-value">${specificData.lazyLoaded}张</span>
                    </div>
                `;
                break;
            case 'internalLinking':
                html += `
                    <div class="data-item">
                        <span class="data-label">链接总数:</span>
                        <span class="data-value">${specificData.totalLinks}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">死链接:</span>
                        <span class="data-value">${specificData.brokenLinks}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">外部链接:</span>
                        <span class="data-value">${specificData.externalLinks}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">外部链接列表:</span>
                        <span class="data-value">${specificData.externalLinksList.join(', ') || '无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">孤立页面:</span>
                        <span class="data-value">${specificData.orphanPages}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">深层链接:</span>
                        <span class="data-value">${specificData.deepLinks}个</span>
                    </div>
                `;
                break;
            case 'sslCertificate':
                html += `
                    <div class="data-item">
                        <span class="data-label">HTTPS状态:</span>
                        <span class="data-value">${specificData.hasSSL ? '✓ 已启用' : '✗ 未启用'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">证书到期天数:</span>
                        <span class="data-value">${specificData.daysToExpire}天</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">HSTS安全头:</span>
                        <span class="data-value">${specificData.hasHSTS ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">混合内容问题:</span>
                        <span class="data-value">${specificData.mixedContent}个</span>
                    </div>
                `;
                break;
            case 'socialMediaTags':
                html += `
                    <div class="data-item">
                        <span class="data-label">Open Graph标签:</span>
                        <span class="data-value">${specificData.hasOpenGraph ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Twitter Card标签:</span>
                        <span class="data-value">${specificData.hasTwitterCards ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">OG图片:</span>
                        <span class="data-value">${specificData.hasOGImage ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">OG描述:</span>
                        <span class="data-value">${specificData.hasOGDescription ? '✓ 已设置' : '✗ 未设置'}</span>
                    </div>
                `;
                break;
            case 'contentQuality':
                html += `
                    <div class="data-item">
                        <span class="data-label">内容字数:</span>
                        <span class="data-value">${specificData.wordCount}词</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">关键词密度:</span>
                        <span class="data-value">${specificData.keywordDensity}%</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">可读性评分:</span>
                        <span class="data-value">${specificData.readabilityScore}分</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">重复内容:</span>
                        <span class="data-value">${specificData.duplicateContent}处</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">内部链接:</span>
                        <span class="data-value">${specificData.internalLinks}个</span>
                    </div>
                    ${specificData.extractedKeywords && specificData.extractedKeywords.length > 0 ? `
                    <div class="data-item full-width">
                        <span class="data-label">提取的关键词:</span>
                        <span class="data-value keywords-list">${specificData.extractedKeywords.join(', ')}</span>
                    </div>
                    ` : ''}
                    ${specificData.topKeywords && specificData.topKeywords.length > 0 ? `
                    <div class="data-item full-width">
                        <span class="data-label">高频关键词:</span>
                        <span class="data-value">
                            ${specificData.topKeywords.map(k => `${k.keyword} (${k.count}次, ${k.density}%)`).join(', ')}
                        </span>
                    </div>
                    ` : ''}
                    ${specificData.keywordSources ? `
                    <div class="data-item full-width">
                        <span class="data-label">关键词来源:</span>
                        <span class="data-value">
                            ${specificData.keywordSources.url && specificData.keywordSources.url.length > 0 ? 
                                `<br>• URL: ${specificData.keywordSources.url.join(', ')}` : ''}
                            ${specificData.keywordSources.title && specificData.keywordSources.title.length > 0 ? 
                                `<br>• 标题: ${specificData.keywordSources.title.slice(0, 10).join(', ')}` : ''}
                            ${specificData.keywordSources.metaKeywords && specificData.keywordSources.metaKeywords.length > 0 ? 
                                `<br>• Meta关键词: ${specificData.keywordSources.metaKeywords.join(', ')}` : ''}
                            ${specificData.keywordSources.h1 && specificData.keywordSources.h1.length > 0 ? 
                                `<br>• H1标签: ${specificData.keywordSources.h1.join(', ')}` : ''}
                        </span>
                    </div>
                    ` : ''}
                `;
                break;
            case 'urlStructure':
                html += `
                    <div class="data-item">
                        <span class="data-label">URL长度:</span>
                        <span class="data-value">${specificData.urlLength}字符</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">包含关键词:</span>
                        <span class="data-value">${specificData.hasKeyword ? '✓ 是' : '✗ 否'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">特殊字符:</span>
                        <span class="data-value">${specificData.specialChars ? '✗ 有' : '✓ 无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">URL层级深度:</span>
                        <span class="data-value">${specificData.urlDepth}层</span>
                    </div>
                `;
                break;
            case 'robotsTxt':
                html += `
                    <div class="data-item">
                        <span class="data-label">Robots.txt文件:</span>
                        <span class="data-value">${specificData.hasRobotsTxt ? '✓ 存在' : '✗ 不存在'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">阻止重要页面:</span>
                        <span class="data-value">${specificData.blockingImportantPages}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Sitemap引用:</span>
                        <span class="data-value">${specificData.hasSitemapReference ? '✓ 有' : '✗ 无'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">阻止CSS文件:</span>
                        <span class="data-value">${specificData.blockingCSS ? '✗ 是' : '✓ 否'}</span>
                    </div>
                `;
                break;
            case 'sitemap':
                html += `
                    <div class="data-item">
                        <span class="data-label">XML站点地图:</span>
                        <span class="data-value">${specificData.hasSitemap ? '✓ 存在' : '✗ 不存在'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">包含页面数:</span>
                        <span class="data-value">${specificData.totalPages}个</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">最后更新:</span>
                        <span class="data-value">${specificData.lastModified || '未知'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">包含图片信息:</span>
                        <span class="data-value">${specificData.includesImages ? '✓ 是' : '✗ 否'}</span>
                    </div>
                `;
                break;
        }
        
        html += '</div>';
        return html;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the SEO Analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.seoAnalyzer = new SEOAnalyzer();
});
