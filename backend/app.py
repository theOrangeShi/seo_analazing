#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import json
import logging
import threading
from queue import Queue
from seo_analyzer import SEOAnalyzer

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化SEO分析器
analyzer = SEOAnalyzer()

@app.route('/api/analyze', methods=['POST'])
def analyze_seo():
    """SEO分析API端点"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL参数缺失'}), 400
        
        logger.info(f"收到SEO分析请求: {url}")
        
        # 执行SEO分析
        result = analyzer.analyze_url(url)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        # 计算总分
        total_score = calculate_total_score(result)
        
        # 格式化结果
        formatted_result = format_seo_result(result, total_score)
        
        logger.info(f"SEO分析完成: {url}, 总分: {total_score}")
        
        return jsonify(formatted_result)
        
    except Exception as e:
        logger.error(f"SEO分析API错误: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-stream', methods=['POST'])
def analyze_seo_stream():
    """SEO分析流式API端点 - 支持实时进度更新"""
    try:
        data = request.get_json()
        url = data.get('url')
        full_site_analysis = data.get('fullSiteAnalysis', False)
        
        if not url:
            return jsonify({'error': 'URL参数缺失'}), 400
        
        logger.info(f"收到SEO流式分析请求: {url}, 全站分析: {full_site_analysis}")
        
        # 创建消息队列用于进度通信
        message_queue = Queue()
        
        def analysis_worker():
            """在单独线程中执行分析"""
            try:
                # 发送开始消息
                message_queue.put({
                    'type': 'progress',
                    'message': '开始SEO分析...',
                    'step': 1,
                    'total': 12
                })
                
                # 执行SEO分析
                result = analyzer.analyze_url(
                    url, 
                    full_site_analysis=full_site_analysis,
                    progress_callback=lambda msg: message_queue.put({
                        'type': 'progress',
                        'message': msg,
                        'step': message_queue.qsize() + 1,
                        'total': 12
                    })
                )
                
                if 'error' in result:
                    message_queue.put({
                        'type': 'error',
                        'message': result['error']
                    })
                else:
                    # 计算总分
                    total_score = calculate_total_score(result)
                    
                    # 格式化结果
                    formatted_result = format_seo_result(result, total_score)
                    
                    # 发送完成消息
                    message_queue.put({
                        'type': 'complete',
                        'data': formatted_result
                    })
                    
            except Exception as e:
                logger.error(f"分析线程错误: {str(e)}")
                message_queue.put({
                    'type': 'error',
                    'message': str(e)
                })
        
        def generate():
            """生成SSE流"""
            # 启动分析线程
            analysis_thread = threading.Thread(target=analysis_worker)
            analysis_thread.daemon = True
            analysis_thread.start()
            
            # 发送SSE流
            while True:
                try:
                    if not message_queue.empty():
                        message = message_queue.get()
                        
                        if message['type'] == 'complete':
                            # 发送最终结果
                            yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
                            break
                        elif message['type'] == 'error':
                            # 发送错误信息
                            yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
                            break
                        else:
                            # 发送进度信息
                            yield f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
                    else:
                        # 等待新消息
                        import time
                        time.sleep(0.1)
                        
                except Exception as e:
                    logger.error(f"SSE流生成错误: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
                    break
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            }
        )
        
    except Exception as e:
        logger.error(f"SEO流式分析API错误: {str(e)}")
        return jsonify({'error': str(e)}), 500

def calculate_total_score(results):
    """计算SEO总分 - 使用动态权重"""
    # 获取网站类型
    website_type = results.get('websiteType', 'content')
    
    # 根据网站类型选择权重
    weights = {
        'content': {  # 内容网站
            'pageSpeed': 15,
            'mobileOptimization': 12,
            'metaTags': 10,
            'headingStructure': 8,
            'imageOptimization': 7,
            'internalLinking': 8,
            'sslCertificate': 10,
            'socialMediaTags': 5,
            'contentQuality': 12,
            'urlStructure': 6,
            'robotsTxt': 4,
            'sitemap': 3
        },
        'functional': {  # 功能性网站
            'pageSpeed': 20,
            'mobileOptimization': 15,
            'metaTags': 5,
            'headingStructure': 3,
            'imageOptimization': 5,
            'internalLinking': 8,
            'sslCertificate': 15,
            'socialMediaTags': 2,
            'contentQuality': 5,
            'urlStructure': 8,
            'robotsTxt': 6,
            'sitemap': 8
        },
        'ecommerce': {  # 电商网站
            'pageSpeed': 12,
            'mobileOptimization': 15,
            'metaTags': 12,
            'headingStructure': 6,
            'imageOptimization': 12,
            'internalLinking': 10,
            'sslCertificate': 12,
            'socialMediaTags': 8,
            'contentQuality': 8,
            'urlStructure': 8,
            'robotsTxt': 5,
            'sitemap': 2
        }
    }
    
    # 选择对应网站类型的权重
    metric_weights = weights.get(website_type, weights['content'])
    
    total_weighted_score = 0
    total_weight = 0
    
    for metric, weight in metric_weights.items():
        if metric in results and 'score' in results[metric]:
            score = results[metric]['score']
            total_weighted_score += score * weight
            total_weight += weight
    
    # 将总分乘以1.2，使满分变为120分
    base_score = total_weighted_score / total_weight if total_weight > 0 else 0
    return round(base_score * 1.2, 1)

def format_seo_result(results, total_score):
    """格式化SEO分析结果"""
    formatted = {
        'totalScore': total_score,
        'status': get_status_text(total_score),
        'websiteType': results.get('websiteType', 'content'),
        'results': {}
    }
    
    # 格式化每个指标的结果
    for metric, data in results.items():
        if metric in ['url', 'websiteType']:
            continue
            
        # 确保data是字典类型
        if isinstance(data, dict):
            formatted['results'][metric] = {
                'score': data.get('score', 0),
                'status': get_status_text(data.get('score', 0)),
                'details': data.get('issues', []),
                'recommendations': generate_recommendations(metric, data.get('score', 0)),
                'specificData': data
            }
        else:
            # 如果data不是字典，创建一个默认结构
            formatted['results'][metric] = {
                'score': 0,
                'status': 'poor',
                'details': ['分析失败'],
                'recommendations': ['请检查网站配置'],
                'specificData': {'error': 'Invalid data format'}
            }
    
    return formatted

def get_status_text(score):
    """根据分数返回状态文本"""
    if score >= 90:
        return 'excellent'
    elif score >= 75:
        return 'good'
    elif score >= 60:
        return 'warning'
    else:
        return 'poor'

def generate_recommendations(metric, score):
    """生成改进建议"""
    recommendations = {
        'pageSpeed': [
            '优化图片大小和格式',
            '压缩CSS和JavaScript文件',
            '启用浏览器缓存',
            '使用CDN加速'
        ],
        'mobileOptimization': [
            '添加viewport meta标签',
            '优化触摸目标大小',
            '使用响应式设计',
            '测试移动端体验'
        ],
        'metaTags': [
            '优化标题长度(30-60字符)',
            '编写吸引人的描述(120-160字符)',
            '添加canonical标签',
            '避免重复标题'
        ],
        'headingStructure': [
            '每页只使用一个H1标签',
            '合理使用H2、H3标签',
            '保持标题层级结构',
            '使用描述性标题文本'
        ],
        'imageOptimization': [
            '为所有图片添加alt属性',
            '使用WebP格式图片',
            '压缩图片文件大小',
            '实现图片懒加载'
        ],
        'internalLinking': [
            '修复所有断链',
            '优化外部链接数量',
            '增加内部链接',
            '简化链接层级结构'
        ],
        'sslCertificate': [
            '确保使用HTTPS',
            '检查SSL证书有效期',
            '启用HSTS',
            '修复混合内容问题'
        ],
        'socialMediaTags': [
            '添加Open Graph标签',
            '配置Twitter Cards',
            '设置社交媒体图片',
            '优化分享描述'
        ],
        'contentQuality': [
            '增加页面内容长度',
            '提高内容质量',
            '优化关键词密度',
            '增加内部链接'
        ],
        'urlStructure': [
            '缩短URL长度',
            '减少URL层级',
            '使用关键词',
            '避免特殊字符'
        ],
        'robotsTxt': [
            '创建robots.txt文件',
            '引用sitemap',
            '避免阻止重要资源',
            '正确配置爬虫规则'
        ],
        'sitemap': [
            '创建sitemap.xml文件',
            '定期更新sitemap',
            '包含所有重要页面',
            '提交到搜索引擎'
        ]
    }
    
    return recommendations.get(metric, ['请参考SEO最佳实践'])

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({'status': 'healthy', 'message': 'SEO分析服务运行正常'})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """获取支持的SEO指标"""
    metrics = {
        'pageSpeed': {
            'name': 'Page Speed 页面速度',
            'icon': 'fas fa-tachometer-alt',
            'weight': 15
        },
        'mobileOptimization': {
            'name': 'Mobile Optimization 移动优化',
            'icon': 'fas fa-mobile-alt',
            'weight': 12
        },
        'metaTags': {
            'name': 'Meta Tags 元标签',
            'icon': 'fas fa-tags',
            'weight': 10
        },
        'headingStructure': {
            'name': 'Heading Structure 标题结构',
            'icon': 'fas fa-heading',
            'weight': 8
        },
        'imageOptimization': {
            'name': 'Image Optimization 图像优化',
            'icon': 'fas fa-image',
            'weight': 8
        },
        'internalLinking': {
            'name': 'Internal Linking 内部链接',
            'icon': 'fas fa-link',
            'weight': 10
        },
        'sslCertificate': {
            'name': 'SSL Certificate SSL证书',
            'icon': 'fas fa-lock',
            'weight': 12
        },
        'socialMediaTags': {
            'name': 'Social Media Tags 社交媒体标签',
            'icon': 'fas fa-share-alt',
            'weight': 6
        },
        'contentQuality': {
            'name': 'Content Quality 内容质量',
            'icon': 'fas fa-file-alt',
            'weight': 10
        },
        'urlStructure': {
            'name': 'URL Structure URL结构',
            'icon': 'fas fa-globe',
            'weight': 5
        },
        'robotsTxt': {
            'name': 'Robots.txt',
            'icon': 'fas fa-robot',
            'weight': 2
        },
        'sitemap': {
            'name': 'XML Sitemap',
            'icon': 'fas fa-sitemap',
            'weight': 2
        }
    }
    
    return jsonify(metrics)

if __name__ == '__main__':
    logger.info("启动SEO分析API服务器...")
    app.run(host='0.0.0.0', port=5001, debug=True)
