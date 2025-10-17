#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
import re
import time
import ssl
import socket
from urllib.parse import urljoin, urlparse
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from collections import Counter
from queue import Queue

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SEOAnalyzer:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # 网站类型权重配置
        # 基于Google SEO官方指南优化（2024年）
        # 核心排名因素：Core Web Vitals > 内容质量 > E-E-A-T > 技术SEO
        self.website_type_weights = {
            'content': {  # 内容网站（博客、新闻、企业官网）
                'pageSpeed': 18,           # Core Web Vitals - 最重要（LCP, FID, CLS）
                'mobileOptimization': 15,  # Mobile-First Indexing - 极其重要
                'contentQuality': 20,      # 内容质量和E-E-A-T - 最核心
                'metaTags': 12,            # Title/Description影响点击率 - 重要
                'sslCertificate': 10,      # HTTPS是排名因素 - 重要
                'headingStructure': 8,     # 内容层级结构 - 中等重要
                'internalLinking': 7,      # 内部链接权重分配 - 中等重要
                'imageOptimization': 5,    # 图片SEO（alt, 格式）- 中等重要
                'socialMediaTags': 2,      # Open Graph - 间接影响
                'urlStructure': 2,         # 简洁URL - 较低重要性
                'robotsTxt': 1,            # 爬虫控制 - 基础要求
                'sitemap': 0               # 辅助索引 - 基础要求（不计分）
            },
            'functional': {  # 功能性网站（搜索、登录、工具）
                'pageSpeed': 25,           # 用户体验最关键
                'mobileOptimization': 20,  # 移动端使用频繁
                'sslCertificate': 18,      # 安全性极其重要
                'contentQuality': 8,       # 内容相对次要
                'internalLinking': 10,     # 导航结构重要
                'metaTags': 6,             # 基本要求
                'urlStructure': 5,         # 功能导向
                'imageOptimization': 3,    # 图片较少
                'headingStructure': 2,     # 结构简单
                'robotsTxt': 2,            # 基础要求
                'sitemap': 1,              # 辅助
                'socialMediaTags': 0       # 不适用（不计分）
            },
            'ecommerce': {  # 电商网站
                'pageSpeed': 16,           # 影响转化率 - 极其重要
                'mobileOptimization': 18,  # 移动购物主流 - 极其重要
                'contentQuality': 12,      # 产品描述质量 - 重要
                'metaTags': 14,            # 产品标题描述 - 重要（CTR）
                'sslCertificate': 15,      # 支付安全 - 极其重要
                'imageOptimization': 10,   # 产品图片 - 重要
                'internalLinking': 8,      # 产品关联 - 重要
                'socialMediaTags': 4,      # 社交分享 - 中等
                'urlStructure': 2,         # 产品URL - 中等
                'headingStructure': 1,     # 基础要求
                'robotsTxt': 0,            # 基础（不计分）
                'sitemap': 0               # 基础（不计分）
            }
        }
    
    def detect_website_type(self, url: str, soup: BeautifulSoup) -> str:
        """检测网站类型"""
        try:
            domain = urlparse(url).netloc.lower()
            title = soup.find('title')
            title_text = title.get_text().lower() if title else ""
            
            # 检测功能性网站
            functional_keywords = ['search', 'google', 'bing', 'yahoo', 'login', 'sign in', 'register', 'tool', 'calculator']
            if any(keyword in title_text for keyword in functional_keywords) or any(keyword in domain for keyword in ['google', 'bing', 'yahoo']):
                return 'functional'
            
            # 检测电商网站
            ecommerce_keywords = ['shop', 'store', 'buy', 'cart', 'checkout', 'product', 'price', 'sale']
            if any(keyword in title_text for keyword in ecommerce_keywords) or any(keyword in domain for keyword in ['shop', 'store', 'mall']):
                return 'ecommerce'
            
            # 检测内容网站
            content_keywords = ['blog', 'news', 'article', 'about', 'company', 'home', 'welcome']
            if any(keyword in title_text for keyword in content_keywords):
                return 'content'
            
            # 默认根据页面内容判断
            text_content = soup.get_text().lower()
            if len(text_content) > 1000:  # 内容较多
                return 'content'
            elif len(text_content) < 200:  # 内容较少
                return 'functional'
            else:
                return 'content'  # 默认内容网站
                
        except Exception as e:
            logger.warning(f"网站类型检测失败: {e}")
            return 'content'  # 默认内容网站
        
    def _normalize_url(self, url: str) -> str:
        """规范化URL格式"""
        # 去除首尾空格
        url = url.strip()
        
        # 移除多余的协议（处理如 https://Https://example.com 的情况）
        # 先统一转小写检查
        url_lower = url.lower()
        
        # 计算协议出现次数
        http_count = url_lower.count('http://')
        https_count = url_lower.count('https://')
        
        # 如果有重复的协议，只保留一个
        if http_count + https_count > 1:
            # 移除所有协议
            url = re.sub(r'(?i)https?://', '', url)
            # 添加一个https协议
            url = 'https://' + url
        else:
            # 确保URL有协议
            if not url.lower().startswith(('http://', 'https://')):
                url = 'https://' + url
            # 统一协议为小写
            elif url.lower().startswith('https://'):
                url = 'https://' + url[8:]
            elif url.lower().startswith('http://'):
                url = 'http://' + url[7:]
        
        return url
    
    def crawl_website(self, start_url: str, max_pages: int = 50, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        爬取网站的多个页面用于全站分析
        
        Args:
            start_url: 起始URL
            max_pages: 最大爬取页面数
            progress_callback: 进度回调函数
            
        Returns:
            包含所有页面信息的字典
        """
        try:
            start_url = self._normalize_url(start_url)
            parsed_start = urlparse(start_url)
            base_domain = f"{parsed_start.scheme}://{parsed_start.netloc}"
            
            visited = set()
            to_visit = Queue()
            to_visit.put((start_url, 0))  # (url, depth)
            
            pages_data = []
            all_internal_links = set()
            
            if progress_callback:
                progress_callback(f"开始爬取网站: {base_domain}")
            
            while not to_visit.empty() and len(visited) < max_pages:
                current_url, depth = to_visit.get()
                
                if current_url in visited or depth > 3:  # 限制深度为3层
                    continue
                    
                visited.add(current_url)
                
                try:
                    if progress_callback:
                        progress_callback(f"正在爬取页面 ({len(visited)}/{max_pages}): {current_url}")
                    
                    response = self.session.get(current_url, timeout=10, verify=False)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # 提取页面信息
                    title = soup.find('title')
                    title_text = title.get_text().strip() if title else ''
                    
                    # 检查是否有标题标签
                    has_headings = bool(soup.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']))
                    
                    # 提取内部链接
                    page_internal_links = set()
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        absolute_url = urljoin(current_url, href)
                        parsed = urlparse(absolute_url)
                        
                        # 只处理同域名的链接
                        if parsed.netloc == parsed_start.netloc:
                            # 去掉锚点和查询参数
                            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                            page_internal_links.add(clean_url)
                            all_internal_links.add(clean_url)
                            
                            # 添加到待访问队列
                            if clean_url not in visited and depth < 3:
                                to_visit.put((clean_url, depth + 1))
                    
                    pages_data.append({
                        'url': current_url,
                        'title': title_text,
                        'depth': depth,
                        'has_headings': has_headings,
                        'internal_links': page_internal_links,
                        'internal_link_count': len(page_internal_links)
                    })
                    
                    # 避免爬取过快
                    time.sleep(0.1)
                    
                except Exception as e:
                    logger.warning(f"爬取页面失败 {current_url}: {str(e)}")
                    continue
            
            if progress_callback:
                progress_callback(f"爬取完成，共爬取 {len(pages_data)} 个页面")
            
            return {
                'pages': pages_data,
                'total_pages': len(pages_data),
                'all_internal_links': all_internal_links,
                'base_domain': base_domain
            }
            
        except Exception as e:
            logger.error(f"网站爬取失败: {str(e)}")
            return {
                'pages': [],
                'total_pages': 0,
                'all_internal_links': set(),
                'base_domain': start_url
            }
        
    def analyze_url(self, url: str, full_site_analysis: bool = False, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """分析单个URL的SEO指标"""
        try:
            # 规范化URL格式
            url = self._normalize_url(url)
                
            logger.info(f"开始分析URL: {url}")
            
            # 如果需要全站分析，先爬取网站
            site_data = None
            if full_site_analysis:
                if progress_callback:
                    progress_callback("开始爬取网站页面...")
                site_data = self.crawl_website(url, max_pages=50, progress_callback=progress_callback)
            
            if progress_callback:
                progress_callback("正在获取页面内容...")
            
            # 获取页面内容，处理SSL错误
            try:
                response = self.session.get(url, timeout=30, verify=True)
                response.raise_for_status()
            except requests.exceptions.SSLError as ssl_error:
                logger.warning(f"SSL错误，尝试不验证SSL证书: {ssl_error}")
                try:
                    response = self.session.get(url, timeout=30, verify=False)
                    response.raise_for_status()
                except Exception as e:
                    logger.error(f"即使不验证SSL也无法访问: {e}")
                    raise e
            except requests.exceptions.RequestException as e:
                logger.error(f"网络请求失败: {e}")
                raise e
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            if progress_callback:
                progress_callback("正在检测网站类型...")
            
            # 检测网站类型
            website_type = self.detect_website_type(url, soup)
            logger.info(f"检测到网站类型: {website_type}")
            
            # 分析各个SEO指标
            if progress_callback:
                progress_callback("正在分析页面速度...")
            
            results = {
                'url': url,
                'websiteType': website_type,
                'pageSpeed': self._analyze_page_speed(response, soup, website_type),
            }
            
            if progress_callback:
                progress_callback("正在分析移动端优化...")
            results['mobileOptimization'] = self._analyze_mobile_optimization(soup, website_type)
            
            if progress_callback:
                progress_callback("正在分析元标签...")
            results['metaTags'] = self._analyze_meta_tags(soup, website_type, site_data)
            
            if progress_callback:
                progress_callback("正在分析标题结构...")
            results['headingStructure'] = self._analyze_heading_structure(soup, website_type, site_data)
            
            if progress_callback:
                progress_callback("正在分析图片优化...")
            results['imageOptimization'] = self._analyze_image_optimization(soup, url, website_type)
            
            if progress_callback:
                progress_callback("正在分析内部链接...")
            results['internalLinking'] = self._analyze_internal_linking(soup, url, website_type, site_data)
            
            if progress_callback:
                progress_callback("正在分析SSL证书...")
            results['sslCertificate'] = self._analyze_ssl_certificate(url, soup, website_type)
            
            if progress_callback:
                progress_callback("正在分析社交媒体标签...")
            results['socialMediaTags'] = self._analyze_social_media_tags(soup, website_type)
            
            if progress_callback:
                progress_callback("正在分析内容质量...")
            results['contentQuality'] = self._analyze_content_quality(soup, url, website_type)
            
            if progress_callback:
                progress_callback("正在分析URL结构...")
            results['urlStructure'] = self._analyze_url_structure(url, website_type)
            
            if progress_callback:
                progress_callback("正在分析Robots.txt...")
            results['robotsTxt'] = self._analyze_robots_txt(url, website_type)
            
            if progress_callback:
                progress_callback("正在分析Sitemap...")
            results['sitemap'] = self._analyze_sitemap(url, website_type)
            
            if progress_callback:
                progress_callback("分析完成！")
            
            logger.info(f"分析完成: {url}")
            return results
            
        except Exception as e:
            logger.error(f"分析URL失败 {url}: {str(e)}")
            return {'error': str(e), 'url': url}
    
    def _analyze_page_speed(self, response: requests.Response, soup: BeautifulSoup, website_type: str = 'content') -> Dict[str, Any]:
        """分析页面速度"""
        try:
            # 计算页面大小
            content_length = len(response.content)
            total_size_kb = content_length / 1024
            
            # 分析图片大小
            images = soup.find_all('img')
            image_size_kb = 0
            large_images = 0
            
            for img in images:
                src = img.get('src')
                if src:
                    try:
                        # 处理相对路径
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            parsed_url = urlparse(response.url)
                            src = f"{parsed_url.scheme}://{parsed_url.netloc}{src}"
                        elif not src.startswith(('http://', 'https://')):
                            src = urljoin(response.url, src)
                        
                        img_response = self.session.head(src, timeout=15, allow_redirects=True)
                        if img_response.status_code == 200:
                            img_size = int(img_response.headers.get('content-length', 0))
                            image_size_kb += img_size / 1024
                            if img_size > 100 * 1024:  # 大于100KB
                                large_images += 1
                    except Exception as e:
                        logger.debug(f"图片大小获取失败 {src}: {e}")
                        # 如果无法获取实际大小，使用估算值
                        image_size_kb += 30  # 估算30KB
            
            # 分析CSS和JS
            css_size_kb = 0
            js_size_kb = 0
            
            # CSS文件
            for link in soup.find_all('link', rel='stylesheet'):
                href = link.get('href')
                if href:
                    try:
                        # 处理相对路径
                        if href.startswith('//'):
                            href = 'https:' + href
                        elif href.startswith('/'):
                            parsed_url = urlparse(response.url)
                            href = f"{parsed_url.scheme}://{parsed_url.netloc}{href}"
                        elif not href.startswith(('http://', 'https://')):
                            href = urljoin(response.url, href)
                        
                        css_response = self.session.head(href, timeout=15, allow_redirects=True)
                        if css_response.status_code == 200:
                            css_size = int(css_response.headers.get('content-length', 0))
                            css_size_kb += css_size / 1024
                    except Exception as e:
                        logger.debug(f"CSS文件大小获取失败 {href}: {e}")
                        # 如果无法获取实际大小，使用估算值
                        css_size_kb += 50  # 估算50KB
            
            # JS文件
            for script in soup.find_all('script', src=True):
                src = script.get('src')
                if src:
                    try:
                        # 处理相对路径
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            parsed_url = urlparse(response.url)
                            src = f"{parsed_url.scheme}://{parsed_url.netloc}{src}"
                        elif not src.startswith(('http://', 'https://')):
                            src = urljoin(response.url, src)
                        
                        js_response = self.session.head(src, timeout=15, allow_redirects=True)
                        if js_response.status_code == 200:
                            js_size = int(js_response.headers.get('content-length', 0))
                            js_size_kb += js_size / 1024
                    except Exception as e:
                        logger.debug(f"JS文件大小获取失败 {src}: {e}")
                        # 如果无法获取实际大小，使用估算值
                        js_size_kb += 100  # 估算100KB
            
            # 计算评分
            score = 100
            if total_size_kb > 2000:  # 大于2MB
                score -= 30
            elif total_size_kb > 1000:  # 大于1MB
                score -= 15
            
            if large_images > 5:
                score -= 20
            elif large_images > 2:
                score -= 10
            
            if css_size_kb > 500:
                score -= 10
            
            if js_size_kb > 500:
                score -= 10
            
            score = max(0, score)
            
            return {
                'score': score,
                'loadTime': int(response.elapsed.total_seconds() * 1000),  # 毫秒
                'totalSize': round(total_size_kb, 2),
                'imageSize': round(image_size_kb, 2),
                'cssSize': round(css_size_kb, 2),
                'jsSize': round(js_size_kb, 2),
                'totalImages': len(images),
                'largeImages': large_images
            }
            
        except Exception as e:
            logger.error(f"页面速度分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_mobile_optimization(self, soup: BeautifulSoup, website_type: str = 'content') -> Dict[str, Any]:
        """分析移动端优化"""
        try:
            score = 100
            issues = []
            
            # 检查viewport meta标签
            viewport_meta = soup.find('meta', attrs={'name': 'viewport'})
            has_viewport = viewport_meta is not None
            
            # 根据网站类型调整移动优化要求
            if website_type == 'functional':
                # 功能性网站（如搜索引擎）移动优化要求较低
                if not has_viewport:
                    score -= 15  # 扣分更少
                    issues.append('缺少viewport meta标签')
                
                # 检查触摸目标大小 - 搜索引擎允许更多小目标
                small_touch_targets = 0
                buttons = soup.find_all(['button', 'a', 'input'])
                for btn in buttons:
                    style = btn.get('style', '')
                    if 'width' in style or 'height' in style:
                        pass
                    else:
                        small_touch_targets += 1
                
                if small_touch_targets > 20:  # 允许更多小触摸目标
                    score -= 10
                    issues.append(f'发现{small_touch_targets}个小触摸目标')
            else:
                # 内容网站和电商网站使用标准
                if not has_viewport:
                    score -= 30
                    issues.append('缺少viewport meta标签')
                
                small_touch_targets = 0
                buttons = soup.find_all(['button', 'a', 'input'])
                for btn in buttons:
                    style = btn.get('style', '')
                    if 'width' in style or 'height' in style:
                        pass
                    else:
                        small_touch_targets += 1
                
                if small_touch_targets > 10:
                    score -= 15
                    issues.append(f'发现{small_touch_targets}个小触摸目标')
            
            # 检查字体大小
            font_size_issues = 0
            # 这里可以添加更复杂的字体大小检查
            
            # 检查移动菜单
            has_mobile_menu = bool(soup.find(class_=re.compile(r'mobile|nav|menu', re.I)))
            
            return {
                'score': max(0, score),
                'hasViewport': has_viewport,
                'smallTouchTargets': small_touch_targets,
                'fontSize': 16,  # 默认字体大小
                'hasMobileMenu': has_mobile_menu,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"移动端优化分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_meta_tags(self, soup: BeautifulSoup, website_type: str = 'content', site_data: Optional[Dict] = None) -> Dict[str, Any]:
        """分析Meta标签"""
        try:
            score = 100
            issues = []
            
            # 标题标签 - 根据网站类型调整标准
            title_tag = soup.find('title')
            title_text = title_tag.get_text().strip() if title_tag else ''
            title_length = len(title_text)
            
            if website_type == 'functional':
                # 功能性网站标题可以更短
                if title_length < 10:
                    score -= 10
                    issues.append(f'标题过短: {title_length}字符')
                elif title_length > 50:
                    score -= 10
                    issues.append(f'标题过长: {title_length}字符')
            else:
                # 内容网站和电商网站使用标准
                if title_length < 30:
                    score -= 20
                    issues.append(f'标题过短: {title_length}字符')
                elif title_length > 60:
                    score -= 15
                    issues.append(f'标题过长: {title_length}字符')
            
            # Meta描述 - 根据网站类型调整标准
            meta_description = soup.find('meta', attrs={'name': 'description'})
            description_text = meta_description.get('content', '') if meta_description else ''
            description_length = len(description_text)
            
            if website_type == 'functional':
                # 功能性网站（如搜索引擎）描述不是必需的，不扣分
                if description_length > 200:
                    score -= 5  # 只有过长才扣分
                    issues.append(f'描述过长: {description_length}字符')
            else:
                # 内容网站和电商网站使用标准
                if description_length < 120:
                    score -= 15
                    issues.append(f'描述过短: {description_length}字符')
                elif description_length > 160:
                    score -= 10
                    issues.append(f'描述过长: {description_length}字符')
            
            # 关键词标签
            has_keyword_meta = bool(soup.find('meta', attrs={'name': 'keywords'}))
            
            # Canonical标签
            has_canonical = bool(soup.find('link', attrs={'rel': 'canonical'}))
            if not has_canonical:
                score -= 10
                issues.append('缺少canonical标签')
            
            # 检查重复标题（需要全站分析）
            duplicate_titles = 0
            if site_data and 'pages' in site_data:
                title_counts = Counter([page['title'] for page in site_data['pages'] if page['title']])
                duplicate_titles = sum(1 for count in title_counts.values() if count > 1)
                if duplicate_titles > 0:
                    score -= min(20, duplicate_titles * 5)
                    issues.append(f'发现{duplicate_titles}个重复标题')
            
            return {
                'score': max(0, score),
                'title': title_text,
                'titleLength': title_length,
                'description': description_text,
                'descriptionLength': description_length,
                'hasKeywordMeta': has_keyword_meta,
                'hasCanonical': has_canonical,
                'duplicateTitles': duplicate_titles,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"Meta标签分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _check_heading_hierarchy(self, soup: BeautifulSoup) -> int:
        """检查标题层级是否有跳跃"""
        try:
            skipped_count = 0
            # 获取所有标题标签及其层级
            all_headings = []
            for level in range(1, 7):  # H1-H6
                headings = soup.find_all(f'h{level}')
                for heading in headings:
                    all_headings.append({
                        'level': level,
                        'text': heading.get_text().strip(),
                        'element': heading
                    })
            
            # 按照在文档中的顺序排序（使用元素在DOM中的位置）
            # 简化版：检查层级差异
            prev_level = 0
            for heading in all_headings:
                current_level = heading['level']
                if prev_level > 0:
                    # 检查是否跳级（例如从H1直接到H3）
                    if current_level - prev_level > 1:
                        skipped_count += 1
                prev_level = current_level
            
            return skipped_count
        except Exception as e:
            logger.warning(f"标题层级检查失败: {e}")
            return 0
    
    def _analyze_heading_structure(self, soup: BeautifulSoup, website_type: str = 'content', site_data: Optional[Dict] = None) -> Dict[str, Any]:
        """分析标题结构"""
        try:
            score = 100
            issues = []
            
            # 统计各级标题
            h1_tags = soup.find_all('h1')
            h2_tags = soup.find_all('h2')
            h3_tags = soup.find_all('h3')
            
            h1_count = len(h1_tags)
            h2_count = len(h2_tags)
            h3_count = len(h3_tags)
            
            # 检查H1标签 - 根据网站类型调整标准
            if website_type == 'functional':
                # 功能性网站H1标签不是必需的
                if h1_count == 0:
                    score -= 10  # 轻微扣分
                    issues.append('缺少H1标签')
                elif h1_count > 2:
                    score -= 15
                    issues.append(f'有{h1_count}个H1标签')
                
                # 功能性网站H2标签要求较低
                if h2_count < 1:
                    score -= 10
                    issues.append(f'H2标签数量较少: {h2_count}个')
            else:
                # 内容网站和电商网站使用标准
                if h1_count == 0:
                    score -= 30
                    issues.append('缺少H1标签')
                elif h1_count > 1:
                    score -= 20
                    issues.append(f'有{h1_count}个H1标签')
                
                # 检查H2标签数量
                if h2_count < 3:
                    score -= 15
                    issues.append(f'H2标签数量较少: {h2_count}个')
            
            # 获取标题文本
            h1_texts = [h1.get_text().strip() for h1 in h1_tags]
            h2_texts = [h2.get_text().strip() for h2 in h2_tags]
            h3_texts = [h3.get_text().strip() for h3 in h3_tags]
            
            # 检查标题层级跳跃
            skipped_levels = self._check_heading_hierarchy(soup)
            if skipped_levels > 0:
                score -= skipped_levels * 5
                issues.append(f'标题层级跳跃{skipped_levels}次')
            
            # 检查缺少标题的页面数（需要全站分析）
            missing_headings = 0
            if site_data and 'pages' in site_data:
                missing_headings = sum(1 for page in site_data['pages'] if not page['has_headings'])
                if missing_headings > 0:
                    score -= min(15, missing_headings * 3)
                    issues.append(f'有{missing_headings}个页面缺少标题标签')
            
            return {
                'score': max(0, score),
                'h1Count': h1_count,
                'h2Count': h2_count,
                'h3Count': h3_count,
                'h1Texts': h1_texts,
                'h2Texts': h2_texts,
                'h3Texts': h3_texts,
                'missingHeadings': missing_headings,
                'skippedLevels': skipped_levels,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"标题结构分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_image_optimization(self, soup: BeautifulSoup, base_url: str, website_type: str = 'content') -> Dict[str, Any]:
        """分析图片优化"""
        try:
            score = 100
            issues = []
            
            images = soup.find_all('img')
            total_images = len(images)
            large_images = 0
            missing_alt = 0
            webp_images = 0
            lazy_loaded = 0
            
            for img in images:
                # 检查alt属性
                if not img.get('alt'):
                    missing_alt += 1
                
                # 检查图片格式
                src = img.get('src', '')
                if src.endswith('.webp'):
                    webp_images += 1
                
                # 检查图片大小（简化版）
                if 'large' in src.lower() or 'big' in src.lower():
                    large_images += 1
                
                # 检查懒加载
                loading = img.get('loading', '')
                if loading == 'lazy':
                    lazy_loaded += 1
            
            # 根据网站类型调整图片优化要求
            if website_type == 'functional':
                # 功能性网站（如搜索引擎）图片要求较低
                if missing_alt > total_images * 0.5:  # 只有超过50%的图片缺少alt才扣分
                    score -= missing_alt * 2  # 扣分更少
                    issues.append(f'有{missing_alt}个图片缺少alt属性')
                
                if large_images > 5:  # 允许更多大图片
                    score -= 10
                    issues.append(f'有{large_images}个大图片')
                
                if webp_images < total_images * 0.3:  # WebP要求更低
                    score -= 5
                    issues.append('WebP格式图片较少')
            else:
                # 内容网站和电商网站使用标准
                if missing_alt > 0:
                    score -= missing_alt * 5
                    issues.append(f'有{missing_alt}个图片缺少alt属性')
                
                if large_images > 3:
                    score -= 15
                    issues.append(f'有{large_images}个大图片')
                
                if webp_images < total_images * 0.5:
                    score -= 10
                    issues.append('WebP格式图片较少')
            
            return {
                'score': max(0, score),
                'totalImages': total_images,
                'largeImages': large_images,
                'missingAlt': missing_alt,
                'webpImages': webp_images,
                'lazyLoaded': lazy_loaded,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"图片优化分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_internal_linking(self, soup: BeautifulSoup, base_url: str, website_type: str = 'content', site_data: Optional[Dict] = None) -> Dict[str, Any]:
        """分析内部链接"""
        try:
            score = 100
            issues = []
            
            # 获取所有链接
            links = soup.find_all('a', href=True)
            total_links = len(links)
            
            internal_links = []
            external_links = []
            broken_links = 0
            
            domain = urlparse(base_url).netloc
            
            for link in links:
                href = link.get('href')
                if not href:
                    continue
                
                # 处理相对链接
                full_url = urljoin(base_url, href)
                link_domain = urlparse(full_url).netloc
                
                if link_domain == domain:
                    internal_links.append(full_url)
                else:
                    external_links.append(full_url)
            
            # 检查断链（简化版，只检查几个）
            for link in internal_links[:5]:  # 只检查前5个
                try:
                    response = self.session.head(link, timeout=5)
                    if response.status_code >= 400:
                        broken_links += 1
                except:
                    broken_links += 1
            
            if broken_links > 0:
                score -= broken_links * 10
                issues.append(f'发现{broken_links}个断链')
            
            if len(external_links) > 15:
                score -= 10
                issues.append('外部链接过多')
            
            # 分析孤立页面和深层链接（需要全站分析）
            orphan_pages = 0
            deep_links = 0
            
            if site_data and 'pages' in site_data:
                # 统计被链接到的页面
                all_linked_urls = set()
                for page in site_data['pages']:
                    all_linked_urls.update(page['internal_links'])
                
                # 找出孤立页面（没有被其他页面链接的页面）
                for page in site_data['pages']:
                    if page['url'] not in all_linked_urls and page['depth'] > 0:
                        orphan_pages += 1
                
                # 统计深层链接（深度>=3的页面）
                deep_links = sum(1 for page in site_data['pages'] if page['depth'] >= 3)
                
                if orphan_pages > 0:
                    score -= min(15, orphan_pages * 5)
                    issues.append(f'发现{orphan_pages}个孤立页面')
                
                if deep_links > 5:
                    score -= 10
                    issues.append(f'有{deep_links}个深层链接（可能影响爬虫抓取）')
            
            return {
                'score': max(0, score),
                'totalLinks': total_links,
                'brokenLinks': broken_links,
                'externalLinks': len(external_links),
                'externalLinksList': external_links[:5],  # 只返回前5个
                'orphanPages': orphan_pages,
                'deepLinks': deep_links,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"内部链接分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _check_hsts_header(self, url: str) -> bool:
        """检查HSTS安全头"""
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            hsts_header = response.headers.get('Strict-Transport-Security', '')
            return bool(hsts_header)
        except Exception as e:
            logger.warning(f"HSTS头检查失败: {e}")
            return False
    
    def _check_mixed_content(self, soup: BeautifulSoup, url: str) -> int:
        """检查混合内容问题"""
        try:
            mixed_count = 0
            parsed_url = urlparse(url)
            
            # 只在HTTPS页面上检查混合内容
            if parsed_url.scheme != 'https':
                return 0
            
            # 检查图片
            for img in soup.find_all('img', src=True):
                src = img.get('src')
                if src.startswith('http://'):
                    mixed_count += 1
            
            # 检查脚本
            for script in soup.find_all('script', src=True):
                src = script.get('src')
                if src.startswith('http://'):
                    mixed_count += 1
            
            # 检查样式表
            for link in soup.find_all('link', href=True):
                href = link.get('href')
                if href.startswith('http://'):
                    mixed_count += 1
            
            # 检查iframe
            for iframe in soup.find_all('iframe', src=True):
                src = iframe.get('src')
                if src.startswith('http://'):
                    mixed_count += 1
            
            return mixed_count
        except Exception as e:
            logger.warning(f"混合内容检查失败: {e}")
            return 0
    
    def _analyze_ssl_certificate(self, url: str, soup: BeautifulSoup, website_type: str = 'content') -> Dict[str, Any]:
        """分析SSL证书"""
        try:
            score = 100
            issues = []
            
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname
            port = parsed_url.port or (443 if parsed_url.scheme == 'https' else 80)
            
            has_ssl = parsed_url.scheme == 'https'
            has_hsts = False
            mixed_content = 0
            days_to_expire = 0
            
            if not has_ssl:
                score = 0
                issues.append('网站未使用HTTPS')
            else:
                # 检查HSTS头
                has_hsts = self._check_hsts_header(url)
                if not has_hsts:
                    score -= 10
                    issues.append('未启用HSTS安全头')
                
                # 检查混合内容
                mixed_content = self._check_mixed_content(soup, url)
                if mixed_content > 0:
                    score -= min(30, mixed_content * 10)
                    issues.append(f'发现{mixed_content}个混合内容问题')
                
                # 检查SSL证书
                try:
                    context = ssl.create_default_context()
                    with socket.create_connection((hostname, port), timeout=10) as sock:
                        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                            cert = ssock.getpeercert()
                            
                            # 检查证书过期时间
                            not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                            days_to_expire = (not_after - datetime.now()).days
                            
                            if days_to_expire < 30:
                                score -= 20
                                issues.append(f'SSL证书将在{days_to_expire}天后过期')
                            
                except Exception as e:
                    score -= 20
                    issues.append(f'SSL证书验证失败: {str(e)}')
            
            return {
                'score': max(0, score),
                'hasSSL': has_ssl,
                'daysToExpire': days_to_expire,
                'hasHSTS': has_hsts,
                'mixedContent': mixed_content,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"SSL证书分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_social_media_tags(self, soup: BeautifulSoup, website_type: str = 'content') -> Dict[str, Any]:
        """分析社交媒体标签"""
        try:
            score = 100
            issues = []
            
            # Open Graph标签
            og_tags = soup.find_all('meta', attrs={'property': re.compile(r'^og:')})
            has_open_graph = len(og_tags) > 0
            
            # Twitter Cards
            twitter_tags = soup.find_all('meta', attrs={'name': re.compile(r'^twitter:')})
            has_twitter_cards = len(twitter_tags) > 0
            
            # OG图片
            og_image = soup.find('meta', attrs={'property': 'og:image'})
            has_og_image = og_image is not None
            
            # OG描述
            og_description = soup.find('meta', attrs={'property': 'og:description'})
            has_og_description = og_description is not None
            
            # 根据网站类型调整社交媒体标签要求
            if website_type == 'functional':
                # 功能性网站（如搜索引擎）不需要社交媒体标签
                # 不扣分，因为这些标签对搜索引擎没有意义
                pass
            else:
                # 内容网站和电商网站需要社交媒体标签
                if not has_open_graph:
                    score -= 20
                    issues.append('缺少Open Graph标签')
                
                if not has_twitter_cards:
                    score -= 15
                    issues.append('缺少Twitter Cards标签')
                
                if not has_og_image:
                    score -= 10
                    issues.append('缺少OG图片')
                
                if not has_og_description:
                    score -= 10
                    issues.append('缺少OG描述')
            
            return {
                'score': max(0, score),
                'hasOpenGraph': has_open_graph,
                'hasTwitterCards': has_twitter_cards,
                'hasOGImage': has_og_image,
                'hasOGDescription': has_og_description,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"社交媒体标签分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _extract_keywords_from_url(self, url: str) -> List[str]:
        """从URL中提取关键词"""
        try:
            parsed_url = urlparse(url)
            # 从路径中提取关键词
            path = parsed_url.path
            # 移除文件扩展名和特殊字符
            path = re.sub(r'\.(html|php|asp|jsp|htm)$', '', path)
            # 分割路径并清理
            keywords = re.split(r'[/\-_]', path)
            # 过滤空字符串和数字
            keywords = [k.lower() for k in keywords if k and len(k) > 2 and not k.isdigit()]
            return keywords
        except Exception as e:
            logger.warning(f"URL关键词提取失败: {e}")
            return []
    
    def _extract_keywords_from_metadata(self, soup: BeautifulSoup) -> Dict[str, List[str]]:
        """从元数据中提取关键词"""
        keywords_dict = {
            'title': [],
            'description': [],
            'keywords': [],
            'h1': [],
            'h2': []
        }
        
        try:
            # 从标题提取
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text().strip()
                # 分词并清理
                words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', title_text.lower())
                keywords_dict['title'] = [w for w in words if len(w) > 2]
            
            # 从Meta描述提取
            meta_description = soup.find('meta', attrs={'name': 'description'})
            if meta_description:
                desc_text = meta_description.get('content', '')
                words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', desc_text.lower())
                keywords_dict['description'] = [w for w in words if len(w) > 2]
            
            # 从Meta关键词提取
            meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
            if meta_keywords:
                keywords_text = meta_keywords.get('content', '')
                keywords = [k.strip().lower() for k in re.split(r'[,，、]', keywords_text) if k.strip()]
                keywords_dict['keywords'] = keywords
            
            # 从H1标签提取
            h1_tags = soup.find_all('h1')
            h1_words = []
            for h1 in h1_tags:
                words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', h1.get_text().lower())
                h1_words.extend([w for w in words if len(w) > 2])
            keywords_dict['h1'] = h1_words
            
            # 从H2标签提取
            h2_tags = soup.find_all('h2')
            h2_words = []
            for h2 in h2_tags[:5]:  # 只取前5个H2
                words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', h2.get_text().lower())
                h2_words.extend([w for w in words if len(w) > 2])
            keywords_dict['h2'] = h2_words
            
        except Exception as e:
            logger.warning(f"元数据关键词提取失败: {e}")
        
        return keywords_dict
    
    def _analyze_keyword_density(self, text_content: str, keywords: List[str]) -> Dict[str, Any]:
        """分析关键词密度"""
        try:
            # 清理文本内容
            text_lower = text_content.lower()
            # 提取所有词语
            all_words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', text_lower)
            total_words = len(all_words)
            
            if total_words == 0:
                return {
                    'totalWords': 0,
                    'keywordStats': [],
                    'averageDensity': 0
                }
            
            # 统计每个关键词的出现次数
            keyword_stats = []
            for keyword in keywords[:10]:  # 只分析前10个关键词
                count = text_lower.count(keyword.lower())
                density = (count / total_words) * 100 if total_words > 0 else 0
                if count > 0:
                    keyword_stats.append({
                        'keyword': keyword,
                        'count': count,
                        'density': round(density, 2)
                    })
            
            # 按密度排序
            keyword_stats.sort(key=lambda x: x['density'], reverse=True)
            
            # 计算平均密度
            avg_density = sum(k['density'] for k in keyword_stats) / len(keyword_stats) if keyword_stats else 0
            
            return {
                'totalWords': total_words,
                'keywordStats': keyword_stats,
                'averageDensity': round(avg_density, 2)
            }
            
        except Exception as e:
            logger.warning(f"关键词密度分析失败: {e}")
            return {
                'totalWords': 0,
                'keywordStats': [],
                'averageDensity': 0
            }
    
    def _get_top_keywords(self, text_content: str, top_n: int = 10) -> List[Dict[str, Any]]:
        """提取页面中最常见的关键词"""
        try:
            # 停用词列表（英文和中文常见停用词）
            stop_words = {
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
                'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
                '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
                '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
                '看', '好', '自己', '这', '那', '里', '就是', '为', '能', '可以'
            }
            
            # 提取所有词语
            text_lower = text_content.lower()
            words = re.findall(r'\b[a-zA-Z]{3,}\b|\b[\u4e00-\u9fa5]{2,}\b', text_lower)
            
            # 过滤停用词并统计
            filtered_words = [w for w in words if w not in stop_words and len(w) > 2]
            word_counts = Counter(filtered_words)
            
            # 获取top N关键词
            top_keywords = []
            for word, count in word_counts.most_common(top_n):
                density = (count / len(words)) * 100 if words else 0
                top_keywords.append({
                    'keyword': word,
                    'count': count,
                    'density': round(density, 2)
                })
            
            return top_keywords
            
        except Exception as e:
            logger.warning(f"提取高频关键词失败: {e}")
            return []
    
    def _analyze_content_quality(self, soup: BeautifulSoup, url: str, website_type: str = 'content') -> Dict[str, Any]:
        """分析内容质量"""
        try:
            score = 100
            issues = []
            
            # 获取文本内容
            text_content = soup.get_text()
            word_count = len(text_content.split())
            
            # 从URL提取关键词
            url_keywords = self._extract_keywords_from_url(url)
            
            # 从元数据提取关键词
            metadata_keywords = self._extract_keywords_from_metadata(soup)
            
            # 合并所有关键词源
            all_keywords = []
            all_keywords.extend(url_keywords)
            all_keywords.extend(metadata_keywords.get('title', []))
            all_keywords.extend(metadata_keywords.get('keywords', []))
            all_keywords.extend(metadata_keywords.get('h1', []))
            
            # 去重
            unique_keywords = list(set(all_keywords))
            
            # 分析关键词密度
            keyword_analysis = self._analyze_keyword_density(text_content, unique_keywords)
            
            # 提取页面中最常见的关键词
            top_keywords = self._get_top_keywords(text_content, top_n=10)
            
            # 计算总体关键词密度
            keyword_density = keyword_analysis.get('averageDensity', 0)
            
            # 可读性评分（简化版：基于平均句子长度）
            sentences = re.split(r'[.!?。！？]', text_content)
            sentences = [s.strip() for s in sentences if s.strip()]
            avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
            
            # 理想句子长度为15-20词
            if avg_sentence_length > 30:
                readability_score = max(0, 100 - (avg_sentence_length - 30) * 2)
            elif avg_sentence_length < 10:
                readability_score = max(0, 100 - (10 - avg_sentence_length) * 3)
            else:
                readability_score = 100
            
            # 检查重复内容（简化版：检查重复的句子）
            sentence_counts = Counter(sentences)
            duplicate_content = sum(1 for count in sentence_counts.values() if count > 1)
            
            # 内部链接数量
            internal_links = len(soup.find_all('a', href=True))
            
            # 根据网站类型调整内容要求
            if website_type == 'functional':
                # 功能性网站内容要求较低
                if word_count < 50:
                    score -= 10
                    issues.append(f'内容过少: {word_count}字')
                elif word_count < 100:
                    score -= 5
                    issues.append(f'内容过少: {word_count}字')
                
                if internal_links < 2:
                    score -= 5
                    issues.append('内部链接较少')
                
                # 功能性网站不强制要求关键词
                if len(unique_keywords) == 0:
                    score -= 5
                    issues.append('未检测到关键词')
                    
            elif website_type == 'ecommerce':
                # 电商网站内容要求中等
                if word_count < 200:
                    score -= 15
                    issues.append(f'内容过少: {word_count}字')
                
                if internal_links < 3:
                    score -= 10
                    issues.append('内部链接较少')
                
                # 电商网站需要适当的关键词
                if len(unique_keywords) < 3:
                    score -= 10
                    issues.append(f'关键词数量不足: {len(unique_keywords)}个')
                
                if keyword_density < 0.5:
                    score -= 10
                    issues.append(f'关键词密度过低: {keyword_density}%')
                elif keyword_density > 5:
                    score -= 15
                    issues.append(f'关键词密度过高: {keyword_density}% (可能被视为关键词堆砌)')
                    
            else:
                # 内容网站使用标准
                if word_count < 300:
                    score -= 20
                    issues.append(f'内容过少: {word_count}字')
                
                if internal_links < 5:
                    score -= 10
                    issues.append('内部链接较少')
                
                # 内容网站需要充足的关键词
                if len(unique_keywords) < 5:
                    score -= 15
                    issues.append(f'关键词数量不足: {len(unique_keywords)}个 (建议≥5个)')
                
                if keyword_density < 1:
                    score -= 15
                    issues.append(f'关键词密度过低: {keyword_density}% (建议1-3%)')
                elif keyword_density > 3:
                    score -= 20
                    issues.append(f'关键词密度过高: {keyword_density}% (可能被视为关键词堆砌)')
            
            # 可读性评分
            if readability_score < 60:
                score -= 10
                issues.append(f'内容可读性较差: {int(readability_score)}分')
            
            # 重复内容检查
            if duplicate_content > 3:
                score -= 15
                issues.append(f'发现{duplicate_content}处重复内容')
            
            return {
                'score': max(0, score),
                'wordCount': word_count,
                'keywordDensity': round(keyword_density, 2),
                'readabilityScore': int(readability_score),
                'duplicateContent': duplicate_content,
                'internalLinks': internal_links,
                'extractedKeywords': unique_keywords[:15],  # 返回前15个提取的关键词
                'topKeywords': top_keywords[:10],  # 返回前10个高频关键词
                'keywordSources': {
                    'url': url_keywords,
                    'title': metadata_keywords.get('title', []),
                    'description': metadata_keywords.get('description', [])[:10],
                    'metaKeywords': metadata_keywords.get('keywords', []),
                    'h1': metadata_keywords.get('h1', []),
                    'h2': metadata_keywords.get('h2', [])[:5]
                },
                'keywordStats': keyword_analysis.get('keywordStats', [])[:10],
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"内容质量分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_url_structure(self, url: str, website_type: str = 'content') -> Dict[str, Any]:
        """分析URL结构"""
        try:
            score = 100
            issues = []
            
            parsed_url = urlparse(url)
            url_length = len(url)
            url_depth = len([p for p in parsed_url.path.split('/') if p])
            
            # 检查URL长度
            if url_length > 100:
                score -= 20
                issues.append(f'URL过长: {url_length}字符')
            
            # 检查URL深度
            if url_depth > 5:
                score -= 15
                issues.append(f'URL层级过深: {url_depth}级')
            
            # 检查特殊字符
            special_chars = re.findall(r'[^a-zA-Z0-9\-_/]', parsed_url.path)
            has_special_chars = len(special_chars) > 0
            
            if has_special_chars:
                score -= 10
                issues.append('URL包含特殊字符')
            
            # 检查关键词（简化版）
            has_keyword = any(keyword in url.lower() for keyword in ['seo', 'optimization', 'marketing'])
            
            return {
                'score': max(0, score),
                'urlLength': url_length,
                'urlDepth': url_depth,
                'hasKeyword': has_keyword,
                'specialChars': has_special_chars,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"URL结构分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_robots_txt(self, url: str, website_type: str = 'content') -> Dict[str, Any]:
        """分析robots.txt"""
        try:
            score = 100
            issues = []
            
            parsed_url = urlparse(url)
            robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
            
            try:
                response = self.session.get(robots_url, timeout=10)
                has_robots_txt = response.status_code == 200
                
                if not has_robots_txt:
                    score -= 20
                    issues.append('缺少robots.txt文件')
                    blocking_important_pages = 0
                    has_sitemap_reference = False
                    blocking_css = False
                else:
                    robots_content = response.text
                    
                    # 检查是否阻止重要页面
                    blocking_important_pages = 0
                    if 'Disallow: /admin' in robots_content:
                        blocking_important_pages += 1
                    
                    # 检查是否引用sitemap
                    has_sitemap_reference = 'Sitemap:' in robots_content
                    
                    # 检查是否阻止CSS
                    blocking_css = 'Disallow: /*.css' in robots_content
                    
                    if blocking_css:
                        score -= 10
                        issues.append('robots.txt阻止了CSS文件')
                    
            except:
                has_robots_txt = False
                blocking_important_pages = 0
                has_sitemap_reference = False
                blocking_css = False
                score -= 20
                issues.append('无法访问robots.txt')
            
            return {
                'score': max(0, score),
                'hasRobotsTxt': has_robots_txt,
                'blockingImportantPages': blocking_important_pages,
                'hasSitemapReference': has_sitemap_reference,
                'blockingCSS': blocking_css,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"robots.txt分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}
    
    def _analyze_sitemap(self, url: str, website_type: str = 'content') -> Dict[str, Any]:
        """分析sitemap"""
        try:
            score = 100
            issues = []
            
            parsed_url = urlparse(url)
            sitemap_url = f"{parsed_url.scheme}://{parsed_url.netloc}/sitemap.xml"
            
            try:
                response = self.session.get(sitemap_url, timeout=10)
                has_sitemap = response.status_code == 200
                
                if not has_sitemap:
                    score -= 30
                    issues.append('缺少sitemap.xml文件')
                    total_pages = 0
                    last_modified = None
                    includes_images = False
                else:
                    # 解析sitemap
                    soup = BeautifulSoup(response.content, 'xml')
                    urls = soup.find_all('url')
                    total_pages = len(urls)
                    
                    # 检查最后修改时间
                    last_modified = None
                    if urls:
                        lastmod = urls[0].find('lastmod')
                        if lastmod:
                            last_modified = lastmod.get_text()
                    
                    # 检查是否包含图片
                    includes_images = bool(soup.find('image:image'))
                    
                    if total_pages < 10:
                        score -= 10
                        issues.append(f'sitemap页面数量较少: {total_pages}个')
                    
                    return {
                        'score': max(0, score),
                        'hasSitemap': True,
                        'totalPages': total_pages,
                        'lastModified': last_modified,
                        'includesImages': includes_images,
                        'issues': issues
                    }
                    
            except:
                has_sitemap = False
                total_pages = 0
                last_modified = None
                includes_images = False
                score -= 30
                issues.append('无法访问sitemap.xml')
            
            return {
                'score': max(0, score),
                'hasSitemap': has_sitemap,
                'totalPages': total_pages,
                'lastModified': last_modified,
                'includesImages': includes_images,
                'issues': issues
            }
            
        except Exception as e:
            logger.error(f"sitemap分析失败: {str(e)}")
            return {'score': 0, 'error': str(e)}

if __name__ == "__main__":
    analyzer = SEOAnalyzer()
    result = analyzer.analyze_url("https://example.com")
    print(json.dumps(result, indent=2, ensure_ascii=False))
