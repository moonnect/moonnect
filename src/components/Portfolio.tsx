/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioData, PortfolioItem } from '@/types';
import * as Icons from 'lucide-react';
import { Mail, Play, Lock, Instagram, Phone, Camera, Clapperboard, Users, Calendar, ArrowRight, ArrowUp, Layers, Film, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getYoutubeEmbedUrl, getYoutubeId, getProcessedImageUrl } from '@/lib/utils';

interface PortfolioProps {
  data: PortfolioData;
  onAdminClick: () => void;
  isAdmin?: boolean;
  onUpdate?: (data: PortfolioData) => void;
  onBackToDashboard?: () => void;
  onLogout?: () => void;
}

const IconMap: Record<string, any> = {
  Camera,
  Clapperboard,
  Users,
  Calendar
};

// Automatically compress and downscale file uploads to prevent exceeding localStorage 5MB limit
const compressImage = async (file: File, maxDim = 900, quality = 0.65): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function Portfolio({ 
  data, 
  onAdminClick,
  isAdmin = false,
  onUpdate,
  onBackToDashboard,
  onLogout
}: PortfolioProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowTopBtn(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<PortfolioItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ title: string; items: PortfolioItem[] } | null>(null);
  const [viewingCommerce, setViewingCommerce] = useState<PortfolioItem | null>(null);
  const [editingCommerceItem, setEditingCommerceItem] = useState<PortfolioItem | null>(null);
  const [showContactEditor, setShowContactEditor] = useState(false);
  const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null);

  const getDefaultText = (key: string) => {
    switch(key) {
      case 'heroTagline': return "Visual Storyteller";
      case 'heroHeadline': return "3초 안에 시선을 \n붙잡는 촬영";
      case 'heroParagraph': return "장면의 몰입도를 설계하는 영상 촬영자";
      case 'heroBtnWorks': return "View Works";
      case 'heroBtnMore': return "Discover More";
      case 'aboutName': return data.name || "전승문";
      case 'aboutRole': return data.role || "JEON SEUNG MOON";
      case 'aboutVisionHeader': return "Vision";
      case 'aboutHeadline': return data.aboutHeadline || "3초 안에 시선을 붙잡는 촬영";
      case 'aboutDescription': return data.about || "다양한 브랜드 및 콘텐츠 촬영 경험을 바탕으로...";
      case 'aboutGoalHeader': return "Core Goal";
      case 'aboutGoal': return data.goal || "다양한 환경에서도 안정적인 촬영과...";
      case 'experienceHeader': return data.sectionTitles?.experience || "Experience Journey";
      case 'worksTagline': return "Showcase";
      case 'worksHeader': return data.sectionTitles?.works || "Activity History";
      default: return "";
    }
  };

  const updateTextStyle = (key: string, updates: any) => {
    if (!onUpdate) return;
    const currentStyles = data.textStyles || {};
    const defaultText = getDefaultText(key);
    const existing = currentStyles[key] || { text: defaultText };
    onUpdate({
      ...data,
      textStyles: {
        ...currentStyles,
        [key]: {
          ...existing,
          ...updates
        }
      }
    });
  };

  const getTextStyle = (key: string, defaultClasses: string) => {
    const config = data.textStyles?.[key];
    if (!config) {
      // Default fallback classes when no config is set yet
      let finalClasses = defaultClasses;
      const wordBreakOverrides = ['break-normal', 'break-words', 'break-all', 'break-keep'];
      const whiteSpaceOverrides = ['whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap'];
      if (!wordBreakOverrides.some(o => defaultClasses.includes(o))) {
        finalClasses += " break-keep";
      }
      if (!whiteSpaceOverrides.some(o => defaultClasses.includes(o))) {
        finalClasses += " whitespace-pre-line";
      }
      return finalClasses;
    }
    
    const classes = defaultClasses.split(' ');
    const sizeOverrides = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-[10px]', 'text-[11px]'];
    const trackingOverrides = ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest', 'tracking-[0.1em]', 'tracking-[0.15em]', 'tracking-[0.2em]', 'tracking-[0.3em]', 'tracking-[0.4em]', 'tracking-[0.5em]', 'tracking-[0.6em]', 'tracking-[0.8em]', 'tracking-[1em]'];
    const alignOverrides = ['text-left', 'text-center', 'text-right', 'text-justify'];
    const weightOverrides = ['font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'];
    const colorOverrides = ['text-white', 'text-slate-200', 'text-violet-500', 'text-violet-400', 'text-zinc-400', 'text-slate-500', 'text-slate-600', 'text-emerald-400', 'text-sky-400', 'text-amber-400', 'text-zinc-300', 'text-slate-400'];
    const styleOverrides = ['italic', 'not-italic'];
    const wordBreakOverrides = ['break-normal', 'break-words', 'break-all', 'break-keep'];
    const whiteSpaceOverrides = ['whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap'];
    
    let filtered = classes.filter(cls => {
      if (config.fontSize && sizeOverrides.some(o => cls === o || cls.startsWith('md:text-') || cls.startsWith('lg:text-') || cls.startsWith('sm:text-'))) return false;
      if (config.tracking && trackingOverrides.includes(cls)) return false;
      if (config.align && alignOverrides.includes(cls)) return false;
      if (config.fontWeight && weightOverrides.includes(cls)) return false;
      if (config.color && colorOverrides.includes(cls)) return false;
      if (config.fontStyle && styleOverrides.includes(cls)) return false;
      if (config.wordBreak && wordBreakOverrides.includes(cls)) return false;
      if (config.whiteSpace && whiteSpaceOverrides.includes(cls)) return false;
      return true;
    });

    if (config.fontSize) filtered.push(config.fontSize);
    if (config.tracking) filtered.push(config.tracking);
    if (config.align) filtered.push(config.align);
    if (config.fontWeight) filtered.push(config.fontWeight);
    if (config.color) filtered.push(config.color);
    if (config.fontStyle) filtered.push(config.fontStyle);
    
    if (config.wordBreak) {
      filtered.push(config.wordBreak);
    } else if (!wordBreakOverrides.some(o => defaultClasses.includes(o))) {
      filtered.push("break-keep");
    }
    
    if (config.whiteSpace) {
      filtered.push(config.whiteSpace);
    } else if (!whiteSpaceOverrides.some(o => defaultClasses.includes(o))) {
      filtered.push("whitespace-pre-line");
    }
    
    return filtered.join(' ');
  };

  const getHighlightClass = (key: string) => {
    if (isAdmin && activeEditorKey === key) {
      return " ring-2 ring-violet-500 ring-offset-4 ring-offset-[#08070b]/90 rounded-xl px-2 py-1 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.4)]";
    }
    return " transition-all duration-300";
  };

  const getText = (key: string, defaultText: string) => {
    return data.textStyles?.[key]?.text ?? defaultText;
  };

  const renderInlineEditor = (key: string) => {
    if (!isAdmin) return null;
    const isOpen = activeEditorKey === key;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveEditorKey(isOpen ? null : key);
        }}
        className="absolute -top-3 -right-3 z-[60] p-1.5 rounded-lg bg-violet-600/90 hover:bg-violet-600 text-white transition-all shadow-xl border border-violet-500/30 active:scale-95 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 duration-300 pointer-events-auto"
        title="문구 실시간 편집 (자간, 폰트크기, 정렬 등)"
      >
        <Icons.Sliders size={11} />
        <span className="text-[9px] font-black uppercase tracking-wider">Edit</span>
      </button>
    );
  };

  const renderInlineEditable = (
    key: string,
    defaultText: string,
    defaultClasses: string,
    renderElement: (classes: string, highlightClass: string, text: string) => React.ReactNode
  ) => {
    const isEditing = isAdmin && activeEditorKey === key;
    const text = getText(key, defaultText);
    const classes = getTextStyle(key, defaultClasses);
    const highlight = getHighlightClass(key);
    
    if (isEditing) {
      return (
        <div 
          className="relative w-full pointer-events-auto my-2 bg-violet-600/15 border border-violet-500/50 rounded-2xl p-2 shadow-xl shadow-violet-500/5" 
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            value={text}
            onChange={(e) => {
              updateTextStyle(key, { text: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className={`w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none overflow-hidden p-1 text-white ${classes}`}
            autoFocus
          />
          <div className="absolute -top-4 right-2 flex gap-1.5 z-50 shadow-2xl">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveEditorKey(null); }}
              className="p-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] border border-emerald-400/20"
              title="저장"
            >
              <Icons.Check size={11} />
              <span>완료</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveEditorKey(null); }}
              className="p-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-extrabold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-md border border-white/10"
              title="닫기"
            >
              <Icons.X size={11} />
              <span>닫기</span>
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative group w-full">
        {renderElement(classes, highlight, text)}
        {renderInlineEditor(key)}
      </div>
    );
  };

  useEffect(() => {
    if (viewingCommerce) {
      setEditingCommerceItem({ ...viewingCommerce });
    } else {
      setEditingCommerceItem(null);
    }
  }, [viewingCommerce]);

  const saveCommerceChanges = () => {
    if (!editingCommerceItem || !onUpdate) return;
    const updatedItems = data.items.map(item => 
      item.id === editingCommerceItem.id ? editingCommerceItem : item
    );
    onUpdate({
      ...data,
      items: updatedItems
    });
    setViewingCommerce(editingCommerceItem);
    alert('상세 페이지 레이아웃이 저장되었습니다.');
  };

  const handleFieldChange = (field: keyof PortfolioItem, value: any) => {
    if (!editingCommerceItem) return;
    setEditingCommerceItem({
      ...editingCommerceItem,
      [field]: value
    });
  };

  const handleGalleryImageReplace = async (imgIndex: number, file: File) => {
    if (!selectedGalleryItem || !onUpdate) return;
    const base64 = await compressImage(file);
    
    let newThumbnailUrl = selectedGalleryItem.thumbnailUrl;
    let newImages = [...(selectedGalleryItem.images || [])];
    
    if (imgIndex === 0) {
      newThumbnailUrl = base64;
    } else {
      const imagesIdx = imgIndex - 1;
      newImages[imagesIdx] = base64;
    }
    
    const updatedItem = {
      ...selectedGalleryItem,
      thumbnailUrl: newThumbnailUrl,
      images: newImages
    };
    
    onUpdate({
      ...data,
      items: data.items.map(item => item.id === selectedGalleryItem.id ? updatedItem : item)
    });
    
    setSelectedGalleryItem(updatedItem);
  };

  const handleGalleryImageDelete = (imgIndex: number) => {
    if (!selectedGalleryItem || !onUpdate) return;
    
    let newThumbnailUrl = selectedGalleryItem.thumbnailUrl;
    let newImages = [...(selectedGalleryItem.images || [])];
    
    if (imgIndex === 0) {
      if (newImages.length > 0) {
        newThumbnailUrl = newImages[0];
        newImages.shift();
      } else {
        newThumbnailUrl = "";
      }
    } else {
      const imagesIdx = imgIndex - 1;
      newImages.splice(imagesIdx, 1);
    }
    
    const updatedItem = {
      ...selectedGalleryItem,
      thumbnailUrl: newThumbnailUrl,
      images: newImages
    };
    
    onUpdate({
      ...data,
      items: data.items.map(item => item.id === selectedGalleryItem.id ? updatedItem : item)
    });
    
    setSelectedGalleryItem(updatedItem);
  };

  const handleGalleryImageAdd = async (file: File) => {
    if (!selectedGalleryItem || !onUpdate) return;
    const base64 = await compressImage(file);
    
    const currentImages = selectedGalleryItem.images || [];
    const newImages = [...currentImages, base64];
    
    const updatedItem = {
      ...selectedGalleryItem,
      images: newImages
    };
    
    onUpdate({
      ...data,
      items: data.items.map(item => item.id === selectedGalleryItem.id ? updatedItem : item)
    });
    
    setSelectedGalleryItem(updatedItem);
  };

  const updateContactStyles = (updates: any) => {
    if (!onUpdate) return;
    const currentStyles = data.contactStyles || {};
    onUpdate({
      ...data,
      contactStyles: {
        ...currentStyles,
        ...updates
      }
    });
  };

  const updateContactHeadline = (text: string) => {
    if (!onUpdate) return;
    const currentStyles = data.contactStyles || {};
    onUpdate({
      ...data,
      contactStyles: {
        ...currentStyles,
        headlineText: text
      },
      sectionTitles: {
        ...(data.sectionTitles || {}),
        contactHeadline: text
      }
    });
  };

  useEffect(() => {
    if (selectedGroup || selectedGalleryItem || viewingCommerce) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedGroup, selectedGalleryItem, viewingCommerce]);

  const groupedItems = data.items.reduce((groups: { [key: string]: PortfolioItem[] }, item) => {
    const category = item.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#08070b] text-slate-200 font-sans selection:bg-violet-500/30 selection:text-violet-200 relative overflow-x-hidden">
      {isAdmin && (
        <div className="sticky top-0 z-[110] w-full bg-slate-950/90 border-b border-violet-500/20 backdrop-blur-3xl px-6 md:px-12 py-3 flex items-center justify-between text-xs font-bold gap-4 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-400" />
            <span className="text-emerald-400 font-extrabold uppercase tracking-widest text-[10px]">ADMIN LIVE PREVIEW & EDIT ACTIVE</span>
          </div>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <Button 
                onClick={onBackToDashboard} 
                className="bg-violet-600 hover:bg-violet-500 text-white font-extrabold h-9 text-[10px] uppercase tracking-widest px-5 rounded-xl border border-violet-500/30 transition-all shadow-md"
              >
                <Icons.Settings size={12} className="mr-2" /> 대시보드로 돌아가기 (Dashboard)
              </Button>
            )}
            {onLogout && (
              <Button 
                onClick={onLogout} 
                className="liquid-glass hover:bg-white/10 text-white font-extrabold h-9 text-[10px] uppercase tracking-widest px-4 rounded-xl border border-white/10 transition-all"
              >
                <Icons.LogOut size={12} className="mr-2" /> 로그아웃 (Logout)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Global Background - Liquid Purple Theme */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep Purple Gradient Mesh */}
        <div className="absolute inset-0 bg-[#08070b]" />
        {!selectedGroup && !selectedGalleryItem && (
          <>
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-violet-950/20 blur-[150px] rounded-full"
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                x: [0, -40, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[80%] bg-purple-900/10 blur-[150px] rounded-full"
            />
          </>
        )}
        
        {/* Subtle Liquid Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <nav className={`fixed ${isAdmin ? 'top-14' : 'top-0'} left-0 right-0 z-50 transition-all duration-500 px-6 md:px-10 py-6 flex items-center justify-between ${isScrolled ? 'bg-[#050507]/60 backdrop-blur-2xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-9 h-9 liquid-glass flex items-center justify-center font-bold text-white text-[11px] rounded-lg tracking-tighter">JM</div>
          <span className="text-lg font-semibold tracking-tight text-white hidden lg:block whitespace-nowrap">전승문 포트폴리오</span>
          <span className="text-lg font-semibold tracking-tight text-white lg:hidden sm:block hidden">{data.name}</span>
        </div>

        <div className="flex items-center gap-4 md:gap-10 text-[10px] md:text-xs font-medium tracking-widest text-slate-400">
          <a href="#about" className="hover:text-violet-500 transition-colors px-2 py-1">About</a>
          <a href="#works" className="hover:text-violet-500 transition-colors px-2 py-1">Works</a>
          <a href="#contact" className="hover:text-violet-500 transition-colors px-2 py-1">Contact</a>
        </div>

        <div className="flex-1 flex justify-end items-center">
          <button 
            onClick={onAdminClick}
            className="text-slate-600 hover:text-white transition-colors ml-4"
          >
            <Lock className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col pt-32 pb-20 px-6 md:px-[10%] overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#050507]" />
            <img 
              src={getProcessedImageUrl(data.heroImage) || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=2000"} 
              className="w-full h-full object-cover opacity-40 shadow-2xl transition-all duration-1000"
              alt="Hero Cinematic"
              referrerPolicy="no-referrer"
            />
            {isAdmin && (
              <div className="absolute top-28 right-8 z-[60]">
                <label className="p-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white transition-all shadow-xl border border-violet-500/30 cursor-pointer flex items-center gap-1.5 active:scale-95 text-[10px] font-bold tracking-wider">
                  <Icons.Camera size={14} />
                  <span>배경 이미지 업로드/교체</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await compressImage(file);
                        if (onUpdate) {
                          onUpdate({ ...data, heroImage: base64 });
                        }
                      }
                    }}
                  />
                </label>
              </div>
            )}
            {/* Cinematic Liquid Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-violet-950/20 to-transparent md:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />
            
            {!selectedGroup && !selectedGalleryItem && (
              <motion.div 
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-violet-600/10 to-transparent mix-blend-screen"
              />
            )}
          </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-4xl">
          <div className="mb-6 inline-block w-fit">
            {renderInlineEditable(
              'heroTagline',
              'Visual Storyteller',
              'text-violet-500 text-xs md:text-sm font-bold tracking-[0.3em]',
              (classes, highlight, text) => (
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${classes} ${highlight} block`}
                >
                  {text}
                </motion.span>
              )
            )}
          </div>
          <div className="mb-8 w-full">
            {renderInlineEditable(
              'heroHeadline',
              '3초 안에 시선을 \n붙잡는 촬영',
              'text-5xl md:text-8xl font-bold text-white leading-[1.1] tracking-tighter',
              (classes, highlight, text) => (
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`${classes} ${highlight} block`}
                >
                  {text}
                </motion.h1>
              )
            )}
          </div>
          <div className="mb-12 w-full">
            {renderInlineEditable(
              'heroParagraph',
              '장면의 몰입도를 설계하는 영상 촬영자',
              'text-slate-400 leading-relaxed text-lg md:text-2xl max-w-2xl font-medium',
              (classes, highlight, text) => (
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`${classes} ${highlight} block`}
                >
                  {text}
                </motion.p>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-6 pt-4">
            <div className="relative group">
              <Button 
                onClick={() => document.getElementById('works')?.scrollIntoView({ behavior: 'smooth' })}
                className={`liquid-glass hover:bg-white/10 text-white font-black tracking-[0.2em] text-sm md:text-base px-10 md:px-14 py-7 h-auto rounded-2xl transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/30 overflow-hidden`}
              >
                {renderInlineEditable(
                  'heroBtnWorks',
                  'View Works',
                  'font-black tracking-[0.2em] text-sm md:text-base bg-transparent border-0 text-center',
                  (classes, highlight, text) => (
                    <span className={`${classes} ${highlight}`}>
                      {text}
                    </span>
                  )
                )}
              </Button>
            </div>
            <div className="relative group">
              <Button 
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className={`liquid-glass bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black tracking-[0.2em] text-sm md:text-base px-10 md:px-14 py-7 h-auto rounded-2xl border border-white/10 transition-all overflow-hidden`}
              >
                {renderInlineEditable(
                  'heroBtnMore',
                  'Discover More',
                  'font-black tracking-[0.2em] text-sm md:text-base bg-transparent border-0 text-center',
                  (classes, highlight, text) => (
                    <span className={`${classes} ${highlight}`}>
                      {text}
                    </span>
                  )
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-40 px-6 md:px-[10%] relative z-10 bg-[#050507]">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/10 via-transparent to-transparent opacity-50" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Left Column: Introduction & Vision */}
            <div className="space-y-16">
              <div className="relative pb-10 border-b border-white/5">
                <div className="w-full">
                  {renderInlineEditable(
                    'aboutName',
                    data.name,
                    'text-5xl md:text-7xl font-black text-white tracking-tighter mb-4',
                    (classes, highlight, text) => (
                      <motion.h2 
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        className={`${classes} ${highlight} block`}
                      >
                        {text}
                      </motion.h2>
                    )
                  )}
                </div>
                <div className="mt-4 flex items-center">
                  <div className="w-8 h-[2px] bg-violet-500 mr-4 flex-shrink-0" />
                  <div className="flex-1">
                    {renderInlineEditable(
                      'aboutRole',
                      data.role,
                      'text-violet-500 text-sm md:text-base font-black tracking-[0.5em]',
                      (classes, highlight, text) => (
                        <p className={`${classes} ${highlight}`}>
                          {text}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
 
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div>
                    {renderInlineEditable(
                      'aboutVisionHeader',
                      'Vision',
                      'text-violet-500 text-xs font-black tracking-[0.3em]',
                      (classes, highlight, text) => (
                        <h4 className={`${classes} ${highlight}`}>
                          {text}
                        </h4>
                      )
                    )}
                  </div>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                
                <div className="w-full">
                  {renderInlineEditable(
                    'aboutHeadline',
                    data.aboutHeadline,
                    'text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter',
                    (classes, highlight, text) => (
                      <p className={`${classes} ${highlight} block`}>
                        {text}
                      </p>
                    )
                  )}
                </div>
                
                <div className="w-full">
                  {renderInlineEditable(
                    'aboutDescription',
                    data.about,
                    'text-zinc-400 text-lg md:text-xl leading-relaxed font-bold border-l-2 border-violet-500/30 pl-6',
                    (classes, highlight, text) => (
                      <p className={`${classes} ${highlight} block`}>
                        {text}
                      </p>
                    )
                  )}
                </div>
              </div>
 
              {/* Goal Section as a highlighted card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="p-10 rounded-[2rem] bg-white/5 border border-white/10 relative group"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-16 h-16 text-violet-500" />
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    {renderInlineEditable(
                      'aboutGoalHeader',
                      'Core Goal',
                      'text-violet-500 text-xs font-black tracking-[0.3em]',
                      (classes, highlight, text) => (
                        <h4 className={`${classes} ${highlight}`}>
                          {text}
                        </h4>
                      )
                    )}
                  </div>
                </div>
                
                <div className="w-full z-10">
                  {renderInlineEditable(
                    'aboutGoal',
                    data.goal,
                    'text-zinc-300 text-xl font-bold italic leading-relaxed',
                    (classes, highlight, text) => (
                      <p className={`${classes} ${highlight} block`}>
                        "{text}"
                      </p>
                    )
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column: Experience Resume */}
            <div className="space-y-16">
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <div>
                    {renderInlineEditable(
                      'experienceHeader',
                      data.sectionTitles?.experience || 'Experience Journey',
                      'text-violet-500 text-xs font-black tracking-[0.3em]',
                      (classes, highlight, text) => (
                        <h5 className={`${classes} ${highlight}`}>
                          {text}
                        </h5>
                      )
                    )}
                  </div>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                
                <div className="space-y-12">
                  {data.experiences.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-8 items-start group"
                    >
                      <div className="relative pt-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/10 group-last:hidden" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <span className="text-violet-500 font-black text-sm tracking-widest block">
                          {item.period}
                        </span>
                        <div className="space-y-2">
                          <h6 className="text-white text-xl md:text-2xl font-black tracking-tight group-hover:text-violet-400 transition-colors leading-tight">
                            {item.title}
                          </h6>
                          {item.description && (
                            <p className="text-zinc-500 text-sm md:text-base font-medium tracking-tight whitespace-pre-wrap leading-relaxed max-w-xl">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Works Section */}
      <section id="works" className="py-40 px-6 md:px-[10%] relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent backdrop-blur-2xl" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-[1px] bg-violet-500" />
                 <div>
                   {renderInlineEditable(
                     'worksTagline',
                     'Showcase',
                     'text-violet-500 text-xs font-bold tracking-[0.3em]',
                     (classes, highlight, text) => (
                       <h2 className={`${classes} ${highlight}`}>
                         {text}
                       </h2>
                     )
                   )}
                 </div>
              </div>
              <div className="w-full mb-12">
                {renderInlineEditable(
                  'worksHeader',
                  data.sectionTitles?.works || 'Activity History',
                  'text-4xl md:text-6xl font-bold text-white tracking-tighter',
                  (classes, highlight, text) => (
                    <h3 className={`${classes} ${highlight} block`}>
                      {text}
                    </h3>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="flex flex-wrap gap-3 mb-24 sticky top-24 z-20 py-4 bg-[#08070b]/40 backdrop-blur-md -mx-4 px-4 rounded-2xl border border-white/5 md:bg-transparent md:backdrop-blur-none md:static md:border-none md:px-0 md:mx-0">
            {Object.keys(groupedItems).map((cat) => (
              <button
                key={cat}
                onClick={() => document.getElementById(`category-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="liquid-glass text-[10px] font-black tracking-[0.2em] px-8 py-3 rounded-xl border border-white/10 hover:border-violet-500/40 text-white/40 hover:text-white hover:bg-violet-500/10 transition-all duration-500"
              >
                {data.categoryTitles?.[cat] || cat}
              </button>
            ))}
          </div>

          <div className="space-y-40">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} id={`category-${category}`} className="scroll-mt-32">
                <div className="flex items-center gap-6 mb-16">
                  <h4 className="text-2xl font-black text-white/20 tracking-[0.4em] whitespace-nowrap">{data.categoryTitles?.[category] || category}</h4>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
                  {(() => {
                    const sortedItems = (items as PortfolioItem[]).sort((a, b) => a.order - b.order);
                    const processed: (PortfolioItem & { isGroup?: boolean; groupCount?: number })[] = [];
                    const seenGroups = new Set();

                    sortedItems.forEach(item => {
                      if (item.group) {
                        if (!seenGroups.has(item.group)) {
                          seenGroups.add(item.group);
                          const gItems = sortedItems.filter(i => i.group === item.group);
                          processed.push({
                            ...item,
                            isGroup: true,
                            groupCount: gItems.length
                          });
                        }
                      } else {
                        processed.push(item);
                      }
                    });
                    return processed;
                  })().map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="group relative flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-900 border border-white/5 rounded-lg mb-8 group-hover:border-violet-500/50 transition-all duration-700 shadow-2xl flex items-center justify-center">
                        {isAdmin && (
                          <div className="absolute top-4 left-4 z-[40] pointer-events-auto">
                            <label className="p-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white transition-all shadow-xl border border-violet-500/30 cursor-pointer flex items-center gap-1.5 active:scale-95 text-[10px] font-bold tracking-wider">
                              <Icons.Camera size={12} />
                              <span>썸네일 업로드</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const base64 = await compressImage(file);
                                    if (onUpdate) {
                                      if (item.isGroup && item.group) {
                                        onUpdate({
                                          ...data,
                                          groupCovers: {
                                            ...(data.groupCovers || {}),
                                            [item.group]: base64
                                          },
                                          items: data.items.map(i => i.id === item.id ? { ...i, thumbnailUrl: base64 } : i)
                                        });
                                      } else {
                                        onUpdate({
                                          ...data,
                                          items: data.items.map(i => i.id === item.id ? { ...i, thumbnailUrl: base64 } : i)
                                        });
                                      }
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                        {item.isGroup ? (
                          <div 
                            className="w-full h-full relative group cursor-pointer"
                            onClick={() => setSelectedGroup({ title: data.groupTitles?.[item.group || ''] || item.group || item.title, items: items.filter(i => i.group === item.group) })}
                          >
                            <img 
                              src={getProcessedImageUrl(data.groupCovers?.[item.group || ''] || item.thumbnailUrl || (item.videoUrl ? `https://img.youtube.com/vi/${getYoutubeId(item.videoUrl)}/maxresdefault.jpg` : ''))} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" 
                              alt={item.title} 
                              referrerPolicy="no-referrer"
                            />
                            {/* Stack Effect */}
                            <div className="absolute top-4 right-4 z-20">
                              <div className="liquid-glass border-white/20 px-4 py-2 rounded-xl flex items-center gap-2">
                                <Layers size={14} className="text-violet-400" />
                                <span className="text-white text-xs font-bold">{item.groupCount} Videos</span>
                              </div>
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 transition-transform group-hover:scale-110">
                               <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center backdrop-blur-md">
                                  <Film size={32} className="text-white" />
                               </div>
                                <span className="text-[10px] tracking-[0.3em] font-black text-white/70">Collection</span>
                            </div>
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </div>
                        ) : (item.category && item.category.toUpperCase().includes('PHOTO')) || (item.images && item.images.length > 0) ? (
                           <div 
                             className="w-full h-full relative group cursor-pointer"
                             onClick={() => {
                               if (item.category === 'COMMERCE') {
                                 setViewingCommerce(item);
                               } else {
                                 setSelectedGalleryItem(item);
                               }
                             }}
                           >
                             <img 
                               src={getProcessedImageUrl(item.thumbnailUrl || (item.images && item.images[0]) || '')} 
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                               alt={item.title} 
                               referrerPolicy="no-referrer"
                             />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 backdrop-blur-sm">
                               <Button 
                                 className="liquid-glass text-white font-bold tracking-widest text-[10px] px-6 py-3 h-auto rounded-xl border-white/20 min-w-[140px]"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (item.category === 'COMMERCE') {
                                     setViewingCommerce(item);
                                   } else {
                                     setSelectedGalleryItem(item);
                                   }
                                 }}
                               >
                                 {item.category === 'COMMERCE' ? 'Open Case Study' : 'Open Gallery'}
                               </Button>

                             </div>
                           </div>
                        ) : item.videoUrl && (item.videoUrl.includes('youtube.com') || item.videoUrl.includes('youtu.be')) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(item.videoUrl)}
                            className="absolute inset-0 w-full h-full"
                            allow="autoplay; fullscreen"
                            title={item.title}
                          ></iframe>
                        ) : (
                          <div className="w-full h-full relative group">
                            {item.thumbnailUrl ? (
                              <img 
                                src={getProcessedImageUrl(item.thumbnailUrl)} 
                                className="w-full h-full object-cover" 
                                alt={item.title} 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-700 bg-slate-900">
                                 <Icons.Image size={40} strokeWidth={1} />
                                 <span className="text-[10px] tracking-[0.2em] font-bold italic">Visual Content</span>
                              </div>
                            )}
                            
                            {item.videoUrl && !item.videoUrl.includes('instagram') && (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <Button 
                                  onClick={() => window.open(item.videoUrl, '_blank')}
                                  className="liquid-glass border-white/20 text-white font-bold tracking-widest text-[10px] px-8 py-4 h-auto rounded-xl flex items-center gap-1.5"
                                >
                                  <span>View Original Post</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="px-2">
                        <div className="flex items-center gap-4 mb-4">
                           <span className="text-slate-800 font-mono text-xs">P-{item.id.slice(-2)}</span>
                           {item.category === 'COMMERCE' && (
                             <span className="text-[9px] bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full font-black tracking-widest border border-violet-500/30 uppercase">Dedicated Case Study</span>
                           )}
                           <div className="flex-1 h-[1px] bg-white/5 group-hover:bg-violet-500/30 transition-colors" />
                        </div>
                        <h4 className="text-3xl font-bold text-white mb-4 tracking-tight group-hover:text-violet-500 transition-colors">{item.isGroup ? (data.groupTitles?.[item.group || ''] || item.group || item.title) : item.title}</h4>
                        <p className="text-slate-500 text-lg leading-relaxed font-medium">
                          {item.description}
                        </p>
                        {item.role && (
                          <div className="mt-4 pt-4 border-t border-white/5 transition-colors group-hover:border-violet-500/20">
                            <span className="text-[10px] font-black tracking-[0.2em] text-violet-400/80 mb-2 block">Role & Tasks</span>
                            <p className="text-slate-300 text-sm font-medium">{item.role}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-40 px-6 md:px-[10%] border-t border-white/5 relative z-10 bg-gradient-to-b from-transparent to-[#0a090d]">
        <div className="max-w-3xl mx-auto">
          {/* Inline Direct Contact Arranger (Only visible to admin) */}
          {isAdmin && (
            <div className="mb-8 p-6 rounded-3xl bg-violet-950/20 border border-violet-500/30 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-violet-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  ✉️ DIRECT CONTACT 실시간 자간 & 배치 에디터 (Arranger)
                </span>
                <Button 
                  onClick={() => setShowContactEditor(!showContactEditor)}
                  variant="ghost" 
                  className="text-[10px] text-zinc-400 font-bold hover:text-white px-2.5 py-1.5 h-auto rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  {showContactEditor ? "설정 닫기" : "설정 열기 (자간/배치 조절)"}
                </Button>
              </div>
              
              {showContactEditor && (
                <div className="space-y-4 pt-4 border-t border-white/5 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Badge Text Arranger */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">배지 텍스트 (Badge Text)</label>
                      <input 
                        type="text"
                        value={data.contactStyles?.badgeText ?? "Direct Contact"}
                        onChange={(e) => updateContactStyles({ badgeText: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* 2. Badge Spacing (자간 - Tracking) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">배지 자간 (Letter Spacing)</label>
                      <select
                        value={data.contactStyles?.badgeTracking ?? "tracking-[0.3em]"}
                        onChange={(e) => updateContactStyles({ badgeTracking: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="tracking-tighter">Tighter (자간 매우 좁음)</option>
                        <option value="tracking-normal">Normal (자간 보통)</option>
                        <option value="tracking-wide">Wide (자간 넓음)</option>
                        <option value="tracking-wider">Wider (자간 더 넓음)</option>
                        <option value="tracking-widest">Widest (자간 가장 넓음)</option>
                        <option value="tracking-[0.2em]">0.2em Spacing</option>
                        <option value="tracking-[0.3em]">0.3em Spacing (기본값)</option>
                        <option value="tracking-[0.4em]">0.4em Spacing (넓고 쾌적함)</option>
                        <option value="tracking-[0.5em]">0.5em Spacing (매우 넓음)</option>
                        <option value="tracking-[0.6em]">0.6em Spacing (우아한 극대화)</option>
                        <option value="tracking-[0.8em]">0.8em Spacing</option>
                        <option value="tracking-[1em]">1.0em Spacing (자간 대폭 넓힘)</option>
                      </select>
                    </div>

                    {/* 3. Headline Text */}
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">메인 헤드라인 (\n 으로 줄바꿈 구분)</label>
                      <input 
                        type="text"
                        value={data.contactStyles?.headlineText ?? data.sectionTitles?.contactHeadline ?? "Let's Build \nSomething Great"}
                        onChange={(e) => updateContactHeadline(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* 4. Headline Spacing (헤드라인 자간) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">헤드라인 자간 (Headline Tracking)</label>
                      <select
                        value={data.contactStyles?.headlineTracking ?? "tracking-tighter"}
                        onChange={(e) => updateContactStyles({ headlineTracking: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="tracking-tighter">Tighter (매우 좁음 / 기본값)</option>
                        <option value="tracking-tight">Tight (좁음)</option>
                        <option value="tracking-normal">Normal (보통)</option>
                        <option value="tracking-wide">Wide (넓음)</option>
                        <option value="tracking-widest">Widest (매우 넓음)</option>
                      </select>
                    </div>

                    {/* 5. Align (배치 조절) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">정렬 및 전체 배치 (Alignment)</label>
                      <select
                        value={data.contactStyles?.badgeAlign ?? "left"}
                        onChange={(e) => updateContactStyles({ badgeAlign: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="left">Left (왼쪽 정렬 / 기본값)</option>
                        <option value="center">Center (중앙 정렬 / 깔끔하고 대칭적임)</option>
                        <option value="right">Right (오른쪽 정렬)</option>
                      </select>
                    </div>

                    {/* 6. Motto Text (모토 문구 실시간 편집) */}
                    <div className="space-y-1.5 col-span-1 md:col-span-2 pt-2 border-t border-white/5">
                      <label className="text-[9.5px] text-violet-400 font-extrabold uppercase block">연결고리 모토 문구 내용 (Motto Phrase Text)</label>
                      <input 
                        type="text"
                        value={data.contactStyles?.mottoText ?? "'연결'을 모토로 삼아 다양한 연결고리로서의 역할을 하겠습니다."}
                        onChange={(e) => updateContactStyles({ mottoText: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-semibold"
                        placeholder="'연결'을 모토로 삼아 다양한 연결고리로서의 역할을 하겠습니다."
                      />
                    </div>

                    {/* 7. Motto Font Size */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 글꼴 크기 (Motto Font Size)</label>
                      <select
                        value={data.contactStyles?.mottoFontSize ?? "text-base md:text-lg"}
                        onChange={(e) => updateContactStyles({ mottoFontSize: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="text-xs md:text-sm">Small (text-xs/sm)</option>
                        <option value="text-sm md:text-base">Medium (text-sm/base)</option>
                        <option value="text-base md:text-lg">Large (text-base/lg / 기본값)</option>
                        <option value="text-lg md:text-xl">X-Large (text-lg/xl)</option>
                        <option value="text-xl md:text-2xl">XX-Large (text-xl/2xl)</option>
                        <option value="text-2xl md:text-3xl">3X-Large (text-2xl/3xl)</option>
                      </select>
                    </div>

                    {/* 8. Motto Tracking (자간) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 자간 (Motto Spacing)</label>
                      <select
                        value={data.contactStyles?.mottoTracking ?? "tracking-normal"}
                        onChange={(e) => updateContactStyles({ mottoTracking: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="tracking-tighter">Tighter (자간 매우 좁음)</option>
                        <option value="tracking-tight">Tight (자간 좁음)</option>
                        <option value="tracking-normal">Normal (자간 보통 / 기본값)</option>
                        <option value="tracking-wide">Wide (자간 넓음)</option>
                        <option value="tracking-wider">Wider (자간 더 넓음)</option>
                        <option value="tracking-widest">Widest (자간 가장 넓음)</option>
                        <option value="tracking-[0.1em]">0.1em Spacing</option>
                        <option value="tracking-[0.15em]">0.15em Spacing</option>
                        <option value="tracking-[0.2em]">0.2em Spacing</option>
                        <option value="tracking-[0.3em]">0.3em Spacing</option>
                        <option value="tracking-[0.4em]">0.4em Spacing</option>
                        <option value="tracking-[0.5em]">0.5em Spacing</option>
                      </select>
                    </div>

                    {/* 9. Motto Font Family */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 글꼴 종류 (Font Family)</label>
                      <select
                        value={data.contactStyles?.mottoFontFamily ?? "font-sans"}
                        onChange={(e) => updateContactStyles({ mottoFontFamily: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="font-sans">Sans-serif (Inter / 기본값)</option>
                        <option value="font-serif">Serif (Playfair Display)</option>
                        <option value="font-mono">Monospace (JetBrains Mono)</option>
                      </select>
                    </div>

                    {/* 10. Motto Font Weight */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 글꼴 굵기 (Font Weight)</label>
                      <select
                        value={data.contactStyles?.mottoFontWeight ?? "font-medium"}
                        onChange={(e) => updateContactStyles({ mottoFontWeight: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="font-light">Light</option>
                        <option value="font-normal">Normal</option>
                        <option value="font-medium">Medium (기본값)</option>
                        <option value="font-semibold">Semibold</option>
                        <option value="font-bold">Bold</option>
                        <option value="font-extrabold">Extra Bold</option>
                        <option value="font-black">Black</option>
                      </select>
                    </div>

                    {/* 11. Motto Color */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 텍스트 색상 (Text Color)</label>
                      <select
                        value={data.contactStyles?.mottoColor ?? "text-zinc-400"}
                        onChange={(e) => updateContactStyles({ mottoColor: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="text-zinc-400">Zinc Gray (기본값)</option>
                        <option value="text-zinc-350">Off-White (부드러운 흰색)</option>
                        <option value="text-white">Pure White</option>
                        <option value="text-violet-450">Light Violet (바이올렛)</option>
                        <option value="text-emerald-400">Emerald Green</option>
                        <option value="text-sky-400">Sky Blue</option>
                        <option value="text-slate-500">Dim Gray</option>
                      </select>
                    </div>

                    {/* 12. Motto Style (Italic) */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase block">모토 글꼴 스타일 (Font Style)</label>
                      <select
                        value={data.contactStyles?.mottoFontStyle ?? "not-italic"}
                        onChange={(e) => updateContactStyles({ mottoFontStyle: e.target.value })}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full focus:border-violet-500 font-medium h-[34px]"
                      >
                        <option value="not-italic">Normal (기본값)</option>
                        <option value="italic">Italic (기울임꼴)</option>
                      </select>
                    </div>
                  </div>

                  {/* Recommend Layout presets for quick apply */}
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">추천 레이아웃 프리셋 (클릭하여 즉시 정렬)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateContactStyles({
                            badgeText: "DIRECT CONTACT",
                            badgeTracking: "tracking-[0.4em]",
                            badgeAlign: "center",
                            headlineTracking: "tracking-tight"
                          });
                          updateContactHeadline("Let's Build\nSomething Great");
                        }}
                        className="text-left text-[11px] p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 text-zinc-350 hover:text-white transition-all font-semibold flex flex-col gap-0.5 cursor-pointer"
                      >
                        <span className="text-violet-400 text-[9px] font-black uppercase">Preset 1: 깔끔한 대칭형 중앙 정렬 (추천)</span>
                        <span className="text-[10px] text-zinc-500 font-medium leading-normal">중앙 정렬 + 자간 0.4em + 헤드라인 줄바꿈</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          updateContactStyles({
                            badgeText: "GET IN TOUCH",
                            badgeTracking: "tracking-[0.5em]",
                            badgeAlign: "center",
                            headlineTracking: "tracking-normal"
                          });
                          updateContactHeadline("언제든 편하게 연락주세요");
                        }}
                        className="text-left text-[11px] p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 text-zinc-350 hover:text-white transition-all font-semibold flex flex-col gap-0.5 cursor-pointer"
                      >
                        <span className="text-violet-400 text-[9px] font-black uppercase">Preset 2: 한글 친화형 중앙 정렬</span>
                        <span className="text-[10px] text-zinc-500 font-medium leading-normal">GET IN TOUCH + 자간 0.5em + 중앙 정렬</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-12 md:p-20 rounded-[3rem] shadow-3xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className={`flex items-center gap-4 mb-8 ${
                data.contactStyles?.badgeAlign === 'center' ? 'justify-center mx-auto' : 
                data.contactStyles?.badgeAlign === 'right' ? 'justify-end' : 
                'justify-start'
              }`}>
                 {data.contactStyles?.badgeAlign !== 'right' && <div className="w-12 h-[1px] bg-violet-500" />}
                 <h2 className={`${data.contactStyles?.badgeColor || "text-violet-500"} ${data.contactStyles?.badgeFontSize || "text-xs"} ${data.contactStyles?.badgeFontWeight || "font-bold"} ${data.contactStyles?.badgeFontStyle || "not-italic"} ${data.contactStyles?.badgeTracking || "tracking-[0.3em]"} uppercase`}>
                   {data.contactStyles?.badgeText || "Direct Contact"}
                 </h2>
                 {data.contactStyles?.badgeAlign === 'center' && <div className="w-12 h-[1px] bg-violet-500" />}
              </div>
              
              <h3 className={`${data.contactStyles?.headlineFontSize || "text-5xl md:text-7xl"} ${data.contactStyles?.headlineFontWeight || "font-black"} ${data.contactStyles?.headlineFontStyle || "not-italic"} ${data.contactStyles?.headlineTracking || "tracking-tighter"} text-white mb-8 leading-none whitespace-pre-line ${
                data.contactStyles?.badgeAlign === 'center' ? 'text-center' : 
                data.contactStyles?.badgeAlign === 'right' ? 'text-right' : 
                'text-left'
              }`}>
                {data.contactStyles?.headlineText?.replace(/\\n/g, '\n') || data.sectionTitles?.contactHeadline || "Let's Build \nSomething Great"}
              </h3>

              {/* Motto / Connection Phrase */}
              <p className={`mb-16 leading-relaxed ${data.contactStyles?.mottoFontFamily || "font-sans"} ${data.contactStyles?.mottoFontSize || "text-base md:text-lg"} ${data.contactStyles?.mottoFontWeight || "font-medium"} ${data.contactStyles?.mottoFontStyle || "not-italic"} ${data.contactStyles?.mottoTracking || "tracking-normal"} ${data.contactStyles?.mottoColor || "text-zinc-400"} ${
                data.contactStyles?.badgeAlign === 'center' ? 'text-center mx-auto' : 
                data.contactStyles?.badgeAlign === 'right' ? 'text-right ml-auto' : 
                'text-left'
              }`}>
                {data.contactStyles?.mottoText ?? "'연결'을 모토로 삼아 다양한 연결고리로서의 역할을 하겠습니다."}
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 ${
                data.contactStyles?.badgeAlign === 'center' ? 'text-center' : 
                data.contactStyles?.badgeAlign === 'right' ? 'text-right' : 
                'text-left'
              }`}>
                <div className="group cursor-pointer">
                  <p className={`${data.contactStyles?.emailLabelFontSize || "text-[10px]"} text-slate-600 tracking-widest mb-4 font-black uppercase`}>
                    {data.contactStyles?.emailLabelText || "Email Address"}
                  </p>
                  <a href={`mailto:${data.contact.email}`} className={`${data.contactStyles?.emailValueFontSize || "text-xl md:text-2xl"} ${data.contactStyles?.emailValueFontWeight || "font-bold"} ${data.contactStyles?.emailValueFontStyle || "not-italic"} text-white group-hover:text-violet-500 transition-colors break-all block`}>
                    {data.contact.email}
                  </a>
                </div>
                <div className="group cursor-pointer">
                  <p className={`${data.contactStyles?.phoneLabelFontSize || "text-[10px]"} text-slate-600 tracking-widest mb-4 font-black uppercase`}>
                    {data.contactStyles?.phoneLabelText || "Mobile"}
                  </p>
                  <span className={`${data.contactStyles?.phoneValueFontSize || "text-xl md:text-2xl"} ${data.contactStyles?.phoneValueFontWeight || "font-bold"} ${data.contactStyles?.phoneValueFontStyle || "not-italic"} text-white group-hover:text-violet-500 transition-colors block`}>
                    {data.contact.phone}
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = `mailto:${data.contact.email}`}
                className={`w-full liquid-glass hover:bg-white/10 text-white tracking-[0.3em] py-10 h-auto rounded-2xl transition-all shadow-2xl border-white/20 overflow-hidden ${data.contactStyles?.buttonFontSize || "text-sm"} ${data.contactStyles?.buttonFontWeight || "font-black"} ${data.contactStyles?.buttonFontStyle || "not-italic"}`}
              >
                {data.contactStyles?.buttonText || "Send Direct Mail"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-24 px-6 md:px-[10%] text-center bg-transparent relative z-10">
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 liquid-glass border border-white/10 rounded-xl flex items-center justify-center font-bold text-white text-xs">JM</div>
            <span className="text-2xl font-black tracking-tighter text-white">{data.name}</span>
          </div>
          <div className="w-16 h-[1px] bg-white/10" />
          <p className="text-[10px] text-slate-700 tracking-[0.6em] font-medium">
            © 2026 {data.name} • ALL RIGHTS RESERVED
          </p>
          <div className="flex gap-4 mt-8">
             <div className="w-[2px] h-[2px] rounded-full bg-slate-900" />
             <div className="w-[2px] h-[2px] rounded-full bg-slate-900" />
             <div 
               className="w-[2px] h-[2px] rounded-full bg-slate-900 cursor-pointer hover:bg-violet-500 transition-colors" 
               onClick={onAdminClick}
             />
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      <AnimatePresence mode="wait">
        {showTopBtn && (
          <motion.button
            key="back-to-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-10 right-10 z-[99] w-14 h-14 rounded-2xl bg-white/[0.08] backdrop-blur-3xl border border-white/20 flex items-center justify-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-white/[0.15] transition-all group overflow-hidden active:scale-95"
            whileHover={{ y: -5 }}
          >
            <ArrowUp size={24} className="relative z-10 group-hover:-translate-y-1 transition-transform" />
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Group Collection Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-10 overflow-y-auto md:py-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#050507]/95"
            onClick={() => setSelectedGroup(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-7xl bg-[#08070b] p-8 md:p-12 rounded-[3.5rem] border border-white/10"
          >
            <button 
              onClick={() => setSelectedGroup(null)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2"
            >
              <Icons.X size={24} />
            </button>
            
            <div className="mb-16">
              <span className="text-violet-500 text-xs font-bold tracking-[0.3em] mb-4 block italic">Portfolio Series</span>
              <h3 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">{selectedGroup.title}</h3>
              <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12 mt-8 py-8 border-t border-b border-white/5">
                {(() => {
                  const uniqueRoles = Array.from(new Set(selectedGroup.items.map(i => i.role).filter(Boolean)));
                  if (uniqueRoles.length === 0) return null;
                  return (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-[1px] bg-violet-500/50 hidden md:block" />
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-violet-400/60 mb-1 block">Involvement & Roles</span>
                        <div className="flex flex-wrap gap-2">
                          {uniqueRoles.map((role, idx) => (
                            <span key={idx} className="text-white text-sm font-medium">
                              {role}{idx < uniqueRoles.length - 1 ? " • " : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-12">
              {selectedGroup.items.sort((a, b) => a.order - b.order).map((item) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group flex flex-col"
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-900 border border-white/5 rounded-2xl mb-6 shadow-2xl group-hover:border-violet-500/30 transition-all duration-500">
                    {item.videoUrl ? (
                      <iframe
                        src={getYoutubeEmbedUrl(item.videoUrl)}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; fullscreen"
                        title={item.title}
                      ></iframe>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
                        <Icons.VideoOff size={32} className="text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="px-2">
                    <h4 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-violet-500 transition-colors">{item.title}</h4>
                    <p className="text-zinc-500 text-sm leading-relaxed font-medium">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Gallery Modal */}
      {selectedGalleryItem && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-10 overflow-y-auto md:py-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#050507]/95"
            onClick={() => setSelectedGalleryItem(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-6xl bg-[#08070b] p-8 md:p-12 rounded-[3.5rem] border border-white/10"
          >
            <button 
              onClick={() => setSelectedGalleryItem(null)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2"
            >
              <Icons.X size={24} />
            </button>
            
            <div className="mb-12">
              <span className="text-violet-500 text-xs font-bold tracking-[0.3em] mb-4 block">BRAND PHOTO GALLERY</span>
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tighter">{selectedGalleryItem.title}</h3>
              <p className="text-slate-400 text-lg max-w-2xl">{selectedGalleryItem.description}</p>
              {selectedGalleryItem.role && (
                <div className="mt-6 flex items-start gap-4">
                  <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                    <span className="text-[10px] font-black tracking-widest text-violet-400">Role</span>
                  </div>
                  <p className="text-slate-300 text-sm font-medium pt-1">{selectedGalleryItem.role}</p>
                </div>
              )}
              {selectedGalleryItem.videoUrl && (selectedGalleryItem.videoUrl.includes('instagram') || selectedGalleryItem.videoUrl.startsWith('http')) && (
                <div className="mt-6">
                  <Button 
                    id="btn-instagram-shortcut"
                    onClick={() => window.open(selectedGalleryItem.videoUrl, '_blank')}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold tracking-widest text-xs px-6 py-3.5 h-auto rounded-xl border border-pink-500/20 flex items-center gap-1.5 w-fit shadow-lg shadow-pink-500/10"
                  >
                    <Instagram size={14} />
                    <span>Instagram 바로가기</span>
                  </Button>
                </div>
              )}

            </div>

            <div className="columns-1 md:columns-2 gap-8 space-y-8">
              {(() => {
                const allImages: string[] = [];
                if (selectedGalleryItem.thumbnailUrl) {
                  allImages.push(selectedGalleryItem.thumbnailUrl);
                }
                if (selectedGalleryItem.images) {
                  selectedGalleryItem.images.forEach(img => {
                    if (img && !allImages.includes(img)) {
                      allImages.push(img);
                    }
                  });
                }
                return allImages.map((img, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative rounded-xl overflow-hidden group shadow-2xl border border-white/5 break-inside-avoid"
                  >
                    <img 
                      src={getProcessedImageUrl(img)} 
                      className="w-full h-auto block group-hover:scale-105 transition-transform duration-700" 
                      alt={`Gallery item ${idx}`} 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {isAdmin && (
                      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                        <label className="p-1.5 rounded-lg bg-violet-600/90 hover:bg-violet-600 text-white cursor-pointer transition-all active:scale-95 text-[9px] font-black tracking-wider flex items-center gap-1">
                          <Icons.RefreshCw size={10} />
                          <span>교체</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleGalleryImageReplace(idx, file);
                            }}
                          />
                        </label>
                        <button 
                          onClick={() => handleGalleryImageDelete(idx)}
                          className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white transition-all active:scale-95 text-[9px] font-black tracking-wider flex items-center gap-1"
                        >
                          <Icons.Trash size={10} />
                          <span>삭제</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ));
              })()}
            </div>
            
            {isAdmin && (
              <div className="mt-12 flex justify-center">
                <label className="p-4 px-8 rounded-2xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 hover:text-white border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 cursor-pointer transition-all active:scale-95 flex items-center gap-2.5 font-bold text-xs tracking-wider uppercase">
                  <Icons.Plus size={14} />
                  <span>새 이미지 추가하기</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGalleryImageAdd(file);
                    }}
                  />
                </label>
              </div>
            )}
            
            <div className="mt-16 text-center">
              <Button 
                onClick={() => setSelectedGalleryItem(null)}
                className="liquid-glass px-12 py-6 rounded-2xl text-white font-bold tracking-widest text-xs border-white/20 hover:bg-white/10"
              >
                Close Gallery
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dedicated Live Commerce Page */}
      <AnimatePresence>
        {viewingCommerce && (
          (() => {
            const localItem = editingCommerceItem || viewingCommerce;
            return (
              <motion.div 
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="fixed inset-0 z-[100] bg-[#07060a] overflow-y-auto flex flex-col font-sans text-slate-200 pb-32"
              >
                {/* Custom Ambient backgrounds */}
                <div className="fixed inset-0 pointer-events-none z-0">
                  <div className="absolute top-0 left-[20%] w-[60%] h-[40%] bg-violet-900/10 blur-[150px] rounded-full" />
                  <div className="absolute bottom-0 right-[10%] w-[50%] h-[50%] bg-purple-950/10 blur-[150px] rounded-full" />
                </div>

                {/* Navigation Bar */}
                <nav className="sticky top-0 z-50 w-full transition-all duration-300 px-6 md:px-12 py-5 bg-[#07060a]/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-black text-white text-[10px] rounded-lg">LIVE</div>
                    <span className="text-xs font-black tracking-[0.25em] text-white uppercase hidden md:inline">JM Live Commerce Case Study</span>
                    {isAdmin && (
                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse whitespace-nowrap">
                        Inline Editor Mode
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={() => setViewingCommerce(null)}
                    className="liquid-glass hover:bg-white/10 text-white font-black tracking-widest text-[10px] px-6 py-3 rounded-xl border border-white/10 flex items-center gap-2"
                  >
                    <Icons.ArrowLeft size={12} />
                    메인 포트폴리오로 돌아가기
                  </Button>
                </nav>

                {/* Hero Section */}
                <div className="relative w-full py-28 md:py-40 px-6 md:px-[10%] border-b border-white/5 overflow-hidden z-10 flex flex-col justify-center bg-[#07060a]">
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={getProcessedImageUrl(localItem.thumbnailUrl || '')} 
                      className="w-full h-full object-cover opacity-20 filter blur-sm scale-105" 
                      alt="Banner background" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/90 to-[#07060a]/70" />
                    {isAdmin && (
                      <div className="absolute top-28 right-8 z-[30] pointer-events-auto">
                        <label className="p-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white transition-all shadow-xl border border-violet-500/30 cursor-pointer flex items-center gap-1.5 active:scale-95 text-[10px] font-bold tracking-wider">
                          <Icons.Camera size={14} />
                          <span>배경 이미지 업로드/교체</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const base64 = await compressImage(file);
                                handleFieldChange('thumbnailUrl', base64);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 max-w-5xl mx-auto w-full">
                    <span className="text-violet-400 text-xs font-black tracking-[0.4em] mb-4 block uppercase p-1 px-3 bg-violet-500/10 border border-violet-500/20 rounded-full w-fit">
                      SPECIAL STUDY PAGE
                    </span>

                    {isAdmin ? (
                      <div className="space-y-2 mb-6">
                        <label className="text-[10px] text-zinc-500 font-black tracking-widest uppercase block">Edit Study Title</label>
                        <input 
                          type="text" 
                          value={localItem.title} 
                          onChange={(e) => handleFieldChange('title', e.target.value)} 
                          className="bg-white/5 border border-violet-500/30 focus:border-violet-500 rounded-xl px-4 py-3 text-2xl md:text-5xl font-black text-white w-full tracking-tighter"
                        />
                      </div>
                    ) : (
                      <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 max-w-4xl leading-[1.1]">
                        {localItem.title}
                      </h1>
                    )}
                    
                    {isAdmin ? (
                      <div className="space-y-2 mb-8">
                        <label className="text-[10px] text-zinc-500 font-black tracking-widest uppercase block">Edit Brief Intro</label>
                        <textarea 
                          rows={3}
                          value={localItem.description} 
                          onChange={(e) => handleFieldChange('description', e.target.value)} 
                          className="bg-white/5 border border-violet-500/30 focus:border-violet-500 rounded-xl px-4 py-3 text-sm md:text-lg font-medium text-slate-300 w-full leading-relaxed"
                        />
                      </div>
                    ) : (
                      <p className="text-slate-400 text-lg md:text-2xl leading-relaxed max-w-3xl font-medium mb-12">
                        {localItem.description}
                      </p>
                    )}

                    {/* Status parameters grids */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 tracking-widest font-black uppercase block mb-1">Technical Role</span>
                        {isAdmin ? (
                          <input 
                            type="text" 
                            value={localItem.role || ''} 
                            onChange={(e) => handleFieldChange('role', e.target.value)} 
                            className="bg-white/5 border border-violet-500/20 px-3 py-1.5 rounded-lg text-white font-bold text-xs w-full"
                          />
                        ) : (
                          <p className="text-white font-bold text-sm md:text-base">{localItem.role || '라이브 기술 감독'}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 tracking-widest font-black uppercase">Category</span>
                        <p className="text-violet-400 font-bold text-sm md:text-base pt-1">LIVE COMMERCE</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 tracking-widest font-black uppercase block mb-1">Resolution</span>
                        {isAdmin ? (
                          <input 
                            type="text" 
                            value={localItem.commerceResolution || '1080p FHD Transmission'} 
                            onChange={(e) => handleFieldChange('commerceResolution', e.target.value)} 
                            className="bg-white/5 border border-violet-500/20 px-3 py-1.5 rounded-lg text-white font-bold text-xs w-full"
                          />
                        ) : (
                          <p className="text-white font-bold text-sm md:text-base">{localItem.commerceResolution || '1080p FHD Transmission'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details / Narration grid (사진과 글로 설명) */}
                <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-24">
                  {/* Story grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-[2px] bg-violet-500" />
                        <span className="text-violet-500 text-xs font-black tracking-[0.3em] uppercase">01. PRODUCTION INSIGHTS</span>
                      </div>
                      {isAdmin ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-violet-950/10 border border-violet-500/20 space-y-4">
                            <span className="text-[10px] text-violet-400 font-extrabold uppercase tracking-widest block">
                              ✍️ 라이브 송출 제목 재배열 에디터 (Title Arranger)
                            </span>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">첫 번째 줄 (Line 1)</label>
                                <input 
                                  type="text"
                                  value={(localItem.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n')[0] || ""}
                                  onChange={(e) => {
                                    const parts = (localItem.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n');
                                    parts[0] = e.target.value;
                                    handleFieldChange('commerceSection1Title', parts.join('\n'));
                                  }}
                                  placeholder="예: 현장의 생동감을 실시간으로"
                                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white w-full focus:border-violet-500 font-medium"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">두 번째 줄 (Line 2)</label>
                                <input 
                                  type="text"
                                  value={(localItem.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n')[1] || ""}
                                  onChange={(e) => {
                                    const parts = (localItem.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n');
                                    parts[1] = e.target.value;
                                    handleFieldChange('commerceSection1Title', parts.join('\n'));
                                  }}
                                  placeholder="예: 독보적인 라이브 송출 전략"
                                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white w-full focus:border-violet-500 font-medium"
                                />
                              </div>
                            </div>

                            {/* Presets for instant rearranging */}
                            <div className="space-y-2">
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase block">추천 문장 배열 예시 (클릭 시 즉시 적용)</span>
                              <div className="flex flex-col gap-1.5 text-left">
                                {[
                                  "현장의 생동감을 실시간으로\n독보적인 라이브 송출 전략",
                                  "실시간 라이브의 생동감을 온전히\n브랜드를 위한 원스톱 송출 솔루션",
                                  "타협 없는 고화질 생중계\n완벽한 무중단 라이브 스트리밍",
                                  "시청자와 소통하는 생생한 현장\n감각적인 연출과 안정적인 송출"
                                ].map((preset, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleFieldChange('commerceSection1Title', preset)}
                                    className="text-left text-[11px] px-3 py-1.5 rounded bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 text-zinc-350 hover:text-white transition-all font-medium leading-normal flex items-start gap-1.5"
                                  >
                                    <span className="text-violet-400 font-bold text-[9px] mt-0.5">#{idx + 1}</span>
                                    <span className="whitespace-pre-line text-xs font-semibold">{preset}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-zinc-500 font-black uppercase block mb-1">Edit Section 1 Lead Description</label>
                            <textarea 
                              rows={3}
                              value={localItem.commerceSection1Lead || "라이브커머스는 단순한 촬영을 넘어 시청자와 브랜드가 실시간으로 소통하는 종합 무대입니다. 따라서 고화질 멀티카메라 생중계 품질과 안정적인 송출 제어망을 설계하는 것이 매우 중요합니다."} 
                              onChange={(e) => handleFieldChange('commerceSection1Lead', e.target.value)} 
                              className="bg-white/5 border border-violet-500/30 rounded-xl px-4 py-2 text-xs font-semibold text-slate-350 w-full leading-relaxed"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight whitespace-pre-line">
                            {localItem.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략"}
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed font-semibold">
                            {localItem.commerceSection1Lead || "라이브커머스는 단순한 촬영을 넘어 시청자와 브랜드가 실시간으로 소통하는 종합 무대입니다. 따라서 고화질 멀티카메라 생중계 품질과 안정적인 송출 제어망을 설계하는 것이 매우 중요합니다."}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="space-y-6 text-slate-400 text-base leading-relaxed border-l border-white/5 pl-8 md:pl-12">
                      {isAdmin ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] text-zinc-500 font-black uppercase block mb-1">Edit Story Paragraph 1</label>
                            <textarea 
                              rows={5}
                              value={localItem.commerceSection1Text1 || "네이버 쇼핑라이브, 카카오 쇼핑라이브, 유튜브 쇼핑 등 대표적인 실시간 판매 채널들의 오퍼레이팅 규격에 맞춘 최상의 네트워크 디렉팅을 설계했습니다. 5G/LTE 결합형 이중 인터넷 백업망을 설계하여, 단 1초의 송출 끊김 위험 요소도 철저하게 비우며 무사고 100% 릴리스를 달성했습니다."} 
                              onChange={(e) => handleFieldChange('commerceSection1Text1', e.target.value)} 
                              className="bg-white/5 border border-violet-500/30 rounded-xl px-4 py-2 text-xs text-slate-300 w-full leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-500 font-black uppercase block mb-1">Edit Story Paragraph 2</label>
                            <textarea 
                              rows={5}
                              value={localItem.commerceSection1Text2 || "역동적인 진행이 필수적인 쇼호스트의 연출선을 고려하여, SONY 미러리스 라인엔 및 시네마 라인의 스틸-Cinetone 픽쳐 프로파일을 튜닝해 현장에서 후보정 없이도 대단히 부드럽고 아름다운 인물 피부 톤을 구현했습니다. 3포인트 기획 조명을 연동하여 상품의 텍스처를 생생히 부각했습니다."} 
                              onChange={(e) => handleFieldChange('commerceSection1Text2', e.target.value)} 
                              className="bg-white/5 border border-violet-500/30 rounded-xl px-4 py-2 text-xs text-slate-300 w-full leading-relaxed"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>
                            {localItem.commerceSection1Text1 || "네이버 쇼핑라이브, 카카오 쇼핑라이브, 유튜브 쇼핑 등 대표적인 실시간 판매 채널들의 오퍼레이팅 규격에 맞춘 최상의 네트워크 디렉팅을 설계했습니다. 5G/LTE 결합형 이중 인터넷 백업망을 설계하여, 단 1초의 송출 끊김 위험 요소도 철저하게 비우며 무사고 100% 릴리스를 달성했습니다."}
                          </p>
                          <p>
                            {localItem.commerceSection1Text2 || "역동적인 진행이 필수적인 쇼호스트의 연출선을 고려하여, SONY 미러리스 라인엔 및 시네마 라인의 스틸-Cinetone 픽쳐 프로파일을 튜닝해 현장에서 후보정 없이도 대단히 부드럽고 아름다운 인물 피부 톤을 구현했습니다. 3포인트 기획 조명을 연동하여 상품의 텍스처를 생생히 부각했습니다."}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Core technical pillars section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-b border-white/5">
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                        <Icons.Camera size={18} />
                      </div>
                      {isAdmin ? (
                        <div className="space-y-2 text-xs">
                          <input 
                            type="text" 
                            value={localItem.commercePillar1Title || "실시간 멀티캠 중계"} 
                            onChange={(e) => handleFieldChange('commercePillar1Title', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-white font-bold text-xs"
                          />
                          <textarea 
                            rows={3}
                            value={localItem.commercePillar1Desc || "전체적인 뷰를 품는 풀샷, 제품 시연을 위한 클로즈업 줌 앵글, 그리고 쇼호스트 전담 팔로우 카메라를 완벽히 동기화해 다채로운 방송 시각을 전달합니다."} 
                            onChange={(e) => handleFieldChange('commercePillar1Desc', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-zinc-400 text-[11px] leading-relaxed"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-white mb-3">{localItem.commercePillar1Title || "실시간 멀티캠 중계"}</h3>
                          <p className="text-zinc-500 text-xs leading-relaxed">
                            {localItem.commercePillar1Desc || "전체적인 뷰를 품는 풀샷, 제품 시연을 위한 클로즈업 줌 앵글, 그리고 쇼호스트 전담 팔로우 카메라를 완벽히 동기화해 다채로운 방송 시각을 전달합니다."}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                        <Icons.Activity size={18} />
                      </div>
                      {isAdmin ? (
                        <div className="space-y-2 text-xs">
                          <input 
                            type="text" 
                            value={localItem.commercePillar2Title || "안정적인 스트리밍"} 
                            onChange={(e) => handleFieldChange('commercePillar2Title', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-white font-bold text-xs"
                          />
                          <textarea 
                            rows={3}
                            value={localItem.commercePillar2Desc || "현장의 무선 환경 유동성에 맞춘 최적 비트레이트 설계와 송출 하드웨어 스위처를 연동하여 트래픽 부하 속에서도 무중단 방송 흐름을 유지합니다."} 
                            onChange={(e) => handleFieldChange('commercePillar2Desc', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-zinc-400 text-[11px] leading-relaxed"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-white mb-3">{localItem.commercePillar2Title || "안정적인 스트리밍"}</h3>
                          <p className="text-zinc-500 text-xs leading-relaxed">
                            {localItem.commercePillar2Desc || "현장의 무선 환경 유동성에 맞춘 최적 비트레이트 설계와 송출 하드웨어 스위처를 연동하여 트래픽 부하 속에서도 무중단 방송 흐름을 유지합니다."}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                        <Icons.Users size={18} />
                      </div>
                      {isAdmin ? (
                        <div className="space-y-2 text-xs">
                          <input 
                            type="text" 
                            value={localItem.commercePillar3Title || "오디오 & 연출 그래픽"} 
                            onChange={(e) => handleFieldChange('commercePillar3Title', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-white font-bold text-xs"
                          />
                          <textarea 
                            rows={3}
                            value={localItem.commercePillar3Desc || "크로마키 패키징, 실시간 가격 자막 CG, 시청자를 위한 안내 레이아웃 연출과 무선 수음 마이크의 오디오 노이즈를 제어해 또렷하고 맑은 음성을 선사합니다."} 
                            onChange={(e) => handleFieldChange('commercePillar3Desc', e.target.value)} 
                            className="bg-white/5 border border-violet-500/30 rounded p-1.5 w-full text-zinc-400 text-[11px] leading-relaxed"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-white mb-3">{localItem.commercePillar3Title || "오디오 & 연출 그래픽"}</h3>
                          <p className="text-zinc-500 text-xs leading-relaxed">
                            {localItem.commercePillar3Desc || "크로마키 패키징, 실시간 가격 자막 CG, 시청자를 위한 안내 레이아웃 연출과 무선 수음 마이크의 오디오 노이즈를 제어해 또렷하고 맑은 음성을 선사합니다."}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Return buttons container */}
                  <div className="flex flex-col sm:flex-row justify-center gap-4 pt-12 border-t border-white/5">
                    <Button 
                      onClick={() => setViewingCommerce(null)}
                      className="liquid-glass hover:bg-white/10 text-white/80 font-bold tracking-widest text-xs px-10 py-5 rounded-xl border border-white/10 h-auto"
                    >
                      목록으로 돌아가기
                    </Button>
                  </div>
                </div>

                {/* Fixed Bottom Save Panel for Live Commerce Admin */}
                {isAdmin && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-zinc-950/90 backdrop-blur-2xl px-6 py-4 rounded-2xl border border-violet-550/35 flex items-center justify-between gap-6 shadow-3xl w-[90%] max-w-lg">
                    <div className="text-left">
                      <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest leading-none mb-1">상세 페이지 실시간 편집 중</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Unsaved changes in active editor cache</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Button 
                        onClick={() => {
                          if (viewingCommerce) {
                            setEditingCommerceItem({ ...viewingCommerce });
                          }
                          alert('편집 데이터가 원래대로 초기화되었습니다.');
                        }}
                        className="liquid-glass hover:bg-white/10 text-white/90 font-bold text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl border border-white/10"
                      >
                        되돌리기
                      </Button>
                      <Button 
                        onClick={saveCommerceChanges}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-5 h-9 rounded-xl flex items-center gap-2 shadow-lg"
                      >
                        <Icons.Save size={12} /> 저장하기 (Save)
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

      {/* Global Text & Style Inspector Panel */}
      <AnimatePresence>
        {activeEditorKey && (() => {
          const config = data.textStyles?.[activeEditorKey] || { text: getDefaultText(activeEditorKey) };
          return (
            <motion.div
              initial={{ opacity: 0, x: 100, y: 0, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, y: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="fixed top-24 right-6 p-6 rounded-3xl bg-[#09080d]/95 backdrop-blur-3xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-80 text-left space-y-4 text-zinc-200 text-xs font-sans normal-case tracking-normal z-[200] max-h-[80vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="font-extrabold text-violet-400 uppercase tracking-widest text-[10px]">Text & Style Arranger</span>
                </div>
                <button 
                  onClick={() => setActiveEditorKey(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                  <Icons.X size={14} />
                </button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">문구 내용 (Text - 줄바꿈 지원)</label>
                <textarea
                  value={config.text}
                  onChange={(e) => updateTextStyle(activeEditorKey, { text: e.target.value })}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-white font-medium"
                  placeholder="텍스트를 입력하세요..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">글자 크기 (Font Size)</label>
                  <select
                    value={config.fontSize || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { fontSize: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">기본 크기 (Default)</option>
                    <option value="text-[10px]">Very Small (10px)</option>
                    <option value="text-xs">Small (12px)</option>
                    <option value="text-sm">Medium (14px)</option>
                    <option value="text-base">Large (16px)</option>
                    <option value="text-lg">X-Large (18px)</option>
                    <option value="text-xl">2X-Large (20px)</option>
                    <option value="text-2xl">3X-Large (24px)</option>
                    <option value="text-3xl">4X-Large (30px)</option>
                    <option value="text-4xl">5X-Large (36px)</option>
                    <option value="text-5xl">6X-Large (48px)</option>
                    <option value="text-6xl">7X-Large (60px)</option>
                    <option value="text-7xl">8X-Large (72px)</option>
                    <option value="text-8xl">9X-Large (96px)</option>
                    <option value="text-xs md:text-sm">Responsive: XS-SM</option>
                    <option value="text-sm md:text-base">Responsive: SM-BASE</option>
                    <option value="text-base md:text-lg">Responsive: BASE-LG</option>
                    <option value="text-lg md:text-xl">Responsive: LG-XL</option>
                    <option value="text-xl md:text-2xl">Responsive: XL-2XL</option>
                    <option value="text-2xl md:text-3xl">Responsive: 2XL-3XL</option>
                    <option value="text-3xl md:text-4xl">Responsive: 3XL-4XL</option>
                    <option value="text-3xl md:text-5xl">Responsive: 3XL-5XL</option>
                    <option value="text-4xl md:text-6xl">Responsive: 4XL-6XL</option>
                    <option value="text-5xl md:text-7xl">Responsive: 5XL-7XL</option>
                    <option value="text-5xl md:text-8xl">Responsive: 5XL-8XL</option>
                    <option value="text-6xl md:text-8xl">Responsive: 6XL-8XL</option>
                    <option value="text-7xl md:text-9xl">Responsive: 7XL-9XL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">자간 (Letter Spacing)</label>
                  <select
                    value={config.tracking || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { tracking: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">기본 자간 (Default)</option>
                    <option value="tracking-tighter">Tighter (매우 좁음)</option>
                    <option value="tracking-tight">Tight (좁음)</option>
                    <option value="tracking-normal">Normal (보통)</option>
                    <option value="tracking-wide">Wide (넓음)</option>
                    <option value="tracking-wider">Wider (더 넓음)</option>
                    <option value="tracking-widest">Widest (가장 넓음)</option>
                    <option value="tracking-[0.1em]">0.1em Spacing</option>
                    <option value="tracking-[0.15em]">0.15em Spacing</option>
                    <option value="tracking-[0.2em]">0.2em Spacing</option>
                    <option value="tracking-[0.3em]">0.3em Spacing</option>
                    <option value="tracking-[0.4em]">0.4em Spacing</option>
                    <option value="tracking-[0.5em]">0.5em Spacing</option>
                    <option value="tracking-[0.6em]">0.6em Spacing</option>
                    <option value="tracking-[0.8em]">0.8em Spacing</option>
                    <option value="tracking-[1em]">1.0em Spacing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">정렬 (Alignment)</label>
                  <select
                    value={config.align || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { align: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">기본 정렬 (Default)</option>
                    <option value="text-left">Left (왼쪽 정렬)</option>
                    <option value="text-center">Center (가운데 정렬)</option>
                    <option value="text-right">Right (오른쪽 정렬)</option>
                    <option value="text-justify">Justify (양끝 정렬)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">글자 색상 (Text Color)</label>
                  <select
                    value={config.color || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { color: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">기본 색상 (Default)</option>
                    <option value="text-white">Pure White (순수 흰색)</option>
                    <option value="text-slate-200">Off-White (부드러운 흰색)</option>
                    <option value="text-zinc-300">Light Gray (밝은 회색)</option>
                    <option value="text-zinc-400">Zinc Gray (기본 회색)</option>
                    <option value="text-slate-500">Dim Gray (어두운 회색)</option>
                    <option value="text-violet-500">Violet (보라색)</option>
                    <option value="text-violet-400">Light Violet (연보라색)</option>
                    <option value="text-emerald-400">Emerald (초록색)</option>
                    <option value="text-sky-400">Sky Blue (하늘색)</option>
                    <option value="text-amber-400">Amber (노란색)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">글자 굵기 (Font Weight)</label>
                  <select
                    value={config.fontWeight || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { fontWeight: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">기본 굵기 (Default)</option>
                    <option value="font-light">Light</option>
                    <option value="font-normal">Normal</option>
                    <option value="font-medium">Medium</option>
                    <option value="font-semibold">Semibold</option>
                    <option value="font-bold">Bold</option>
                    <option value="font-extrabold">Extra Bold</option>
                    <option value="font-black">Black</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">단어 끊기 (Word Break)</label>
                  <select
                    value={config.wordBreak || ""}
                    onChange={(e) => updateTextStyle(activeEditorKey, { wordBreak: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">기본 방식 (Default)</option>
                    <option value="break-keep">Keep All (단어 보존 - 권장)</option>
                    <option value="break-all">Break All (글자 줄바꿈)</option>
                    <option value="break-words">Break Words (단어 우선)</option>
                    <option value="break-normal">Normal (기본)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">공백/개행 표시 (Line Wrap & White Space)</label>
                <select
                  value={config.whiteSpace || ""}
                  onChange={(e) => updateTextStyle(activeEditorKey, { whiteSpace: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">기본 방식 (Default)</option>
                  <option value="whitespace-pre-line">Pre-Line (줄바꿈+자동줄바꿈)</option>
                  <option value="whitespace-pre-wrap">Pre-Wrap (엔터+모든공백 유지)</option>
                  <option value="whitespace-nowrap">No Wrap (줄바꿈 방지)</option>
                  <option value="whitespace-normal">Normal (자동 줄바꿈)</option>
                </select>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

