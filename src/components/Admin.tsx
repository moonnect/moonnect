/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioData, PortfolioItem, ExperienceItem, BtsImage } from '@/types';
import { Trash2, Plus, LogOut, Save, Crop as CropIcon, X, Eye } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getYoutubeId, getProcessedImageUrl } from '@/lib/utils';

// Helper function to create an image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Helper function to get cropped image with downscaling/compression to fit localStorage
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const MAX_DIMENSION = 900;
  let width = pixelCrop.width;
  let height = pixelCrop.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL('image/jpeg', 0.65);
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

interface AdminProps {
  data: PortfolioData;
  onUpdate: (data: PortfolioData) => void;
  onLogout: () => void;
  onGoToPreview?: () => void;
}

export default function Admin({ data, onUpdate, onLogout, onGoToPreview }: AdminProps) {
  const [localData, setLocalData] = useState<PortfolioData>(data);

  const groupedItems = localData.items.reduce((groups: { [key: string]: PortfolioItem[] }, item) => {
    const category = item.category || 'Uncategorized';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppingTarget, setCroppingTarget] = useState<{ 
    type: 'hero' | 'thumbnail' | 'gallery' | 'bts' | 'group' | 'gear'; 
    itemId?: string;
    imageIndex?: number;
    groupId?: string;
    gearId?: string;
  } | null>(null);
  // Optional aspect ratio - default to 16/9 for video/portfolio, can be adjusted
  const [aspect, setAspect] = useState(16 / 9);

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (imageToCrop && croppedAreaPixels && croppingTarget) {
      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        
        if (croppingTarget.type === 'hero') {
          setLocalData(prev => ({ ...prev, heroImage: croppedImage }));
        } else if (croppingTarget.type === 'thumbnail' && croppingTarget.itemId) {
          setLocalData(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === croppingTarget.itemId ? { ...i, thumbnailUrl: croppedImage } : i)
          }));
        } else if (croppingTarget.type === 'gallery' && croppingTarget.itemId) {
          setLocalData(prev => {
            const item = prev.items.find(i => i.id === croppingTarget.itemId);
            if (!item) return prev;
            const currentImages = item.images || [];
            
            let newImages;
            if (croppingTarget.imageIndex !== undefined) {
              newImages = [...currentImages];
              newImages[croppingTarget.imageIndex] = croppedImage;
            } else {
              newImages = [...currentImages, croppedImage];
            }

            return {
              ...prev,
              items: prev.items.map(i => i.id === croppingTarget.itemId ? { ...i, images: newImages } : i)
            };
          });
        } else if (croppingTarget.type === 'bts') {
          setLocalData(prev => {
            if (croppingTarget.imageIndex !== undefined) {
              const newBts = [...prev.btsImages];
              newBts[croppingTarget.imageIndex] = { ...newBts[croppingTarget.imageIndex], url: croppedImage };
              return { ...prev, btsImages: newBts };
            }
            return {
              ...prev,
              btsImages: [...prev.btsImages, { id: Math.random().toString(36).substr(2, 9), url: croppedImage }]
            };
          });
        } else if (croppingTarget.type === 'group' && croppingTarget.groupId) {
          setLocalData(prev => {
            const updatedCovers = { ...(prev.groupCovers || {}) };
            updatedCovers[croppingTarget.groupId as string] = croppedImage;
            return {
              ...prev,
              groupCovers: updatedCovers
            };
          });
        } else if (croppingTarget.type === 'gear' && croppingTarget.gearId) {
          setLocalData(prev => ({
            ...prev,
            gear: prev.gear.map(g => g.id === croppingTarget.gearId ? { ...g, imageUrl: croppedImage } : g)
          }));
        }

        setImageToCrop(null);
        setCroppingTarget(null);
      } catch (e) {
        console.error("Crop failed:", e);
        alert("이미지 편집 중 오류가 발생했습니다.");
      }
    }
  };

  const save = () => {
    onUpdate(localData);
    alert('저장되었습니다.');
  };

  const addItem = () => {
    const newItem: PortfolioItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Video',
      description: 'Description',
      videoUrl: 'https://www.youtube.com/embed/...',
      category: 'General',
      order: localData.items.length,
    };
    setLocalData({ ...localData, items: [...localData.items, newItem] });
  };

  const deleteItem = (id: string) => {
    setLocalData({ ...localData, items: localData.items.filter(i => i.id !== id) });
  };

  const updateItem = (id: string, updates: Partial<PortfolioItem>) => {
    setLocalData({
      ...localData,
      items: localData.items.map(i => i.id === id ? { ...i, ...updates } : i)
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <div className="flex gap-4">
            {onGoToPreview && (
              <Button 
                onClick={() => {
                  onUpdate(localData);
                  onGoToPreview();
                }} 
                className="bg-violet-600 hover:bg-violet-700 font-bold text-white"
              >
                <Eye className="w-4 h-4 mr-2" /> 라이브 상세페이지 실시간 편집
              </Button>
            )}
            <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" /> 저장하기
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" /> 로그아웃
            </Button>
          </div>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="bg-zinc-900 border-zinc-800 mb-8">
            <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
            <TabsTrigger value="about">정보 관리</TabsTrigger>
            <TabsTrigger value="experience">경력</TabsTrigger>
            <TabsTrigger value="gear">장비</TabsTrigger>
            <TabsTrigger value="bts">현장 사진</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio">
            <div className="space-y-12">
              {/* Group/Series Management Section */}
              <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                   <div>
                     <h3 className="text-xl font-bold text-white tracking-tight">Collection & Series Management</h3>
                     <p className="text-sm text-zinc-500 mt-1">동일한 그룹 이름을 가진 영상들의 대표 이미지를 관리합니다.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from(new Set(localData.items.filter(i => i.group).map(i => i.group))).map((groupName: any) => (
                    <Card key={groupName} className="bg-zinc-950/50 border-zinc-800 text-zinc-100 overflow-hidden group">
                      <div className="aspect-video relative overflow-hidden bg-black flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-500">
                        <img 
                          src={getProcessedImageUrl(localData.groupCovers?.[groupName] || localData.items.find(i => i.group === groupName)?.thumbnailUrl || '')} 
                          className="w-full h-full object-cover opacity-60" 
                          alt={groupName}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="liquid-glass px-4 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all font-bold text-[10px] tracking-widest border-white/10">
                            커버 수정
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImageToCrop(reader.result as string);
                                  setAspect(0);
                                  setCroppingTarget({ type: 'group', groupId: groupName });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                        <div className="absolute top-4 left-4">
                           <span className="px-3 py-1 bg-violet-600 rounded-full text-[9px] font-black tracking-widest">COLLECTION</span>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500">시리즈 표시 제목</Label>
                          <Input 
                            value={localData.groupTitles?.[groupName] || groupName}
                            onChange={e => {
                              setLocalData({
                                ...localData,
                                groupTitles: { ...(localData.groupTitles || {}), [groupName]: e.target.value }
                              });
                            }}
                            className="bg-zinc-900 border-zinc-800 text-[11px] h-8 px-2 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500">커버 소스 URL</Label>
                          <Input 
                            value={localData.groupCovers?.[groupName] || ''} 
                            onChange={e => {
                              setLocalData({
                                ...localData,
                                groupCovers: { ...(localData.groupCovers || {}), [groupName]: e.target.value }
                              });
                            }} 
                            className="bg-zinc-900 border-zinc-800 text-[10px] h-7" 
                            placeholder="이미지 주소..."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {localData.items.filter(i => i.group).length === 0 && (
                    <div className="col-span-full py-12 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 gap-2">
                       <Plus className="w-5 h-5 opacity-20" />
                       <p className="text-[11px] tracking-widest font-medium">No Series Found. Add a group name to a video to create a series.</p>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Category Management Section */}
              <section className="bg-zinc-900/10 border border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                   <div>
                     <h3 className="text-xl font-bold text-white tracking-tight">Category Labels</h3>
                     <p className="text-sm text-zinc-500 mt-1">상단 네비게이션 및 섹션 헤더에서 사용되는 카테고리 이름을 수정합니다.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(groupedItems).map((catName) => (
                    <div key={catName} className="space-y-2 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                      <Label className="text-[10px] text-zinc-500 tracking-widest">Original: {catName}</Label>
                      <Input 
                        value={localData.categoryTitles?.[catName] || catName}
                        onChange={e => {
                          setLocalData({
                            ...localData,
                            categoryTitles: { ...(localData.categoryTitles || {}), [catName]: e.target.value }
                          });
                        }}
                        className="bg-zinc-900 border-zinc-800 text-sm font-bold"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">Individual Projects</h3>
                  <Button variant="outline" onClick={addItem} className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                    <Plus className="w-4 h-4 mr-2" /> 새 영상 추가
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localData.items.sort((a,b) => a.order - b.order).map((item) => (
                    <Card key={item.id} className="bg-zinc-900 border-zinc-800 text-zinc-100 overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Video ID: {item.id}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-zinc-500 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="bg-zinc-950 border border-zinc-800 mb-6 w-full justify-start overflow-x-auto">
                        <TabsTrigger value="basic" className="text-xs">기본 정보</TabsTrigger>
                        <TabsTrigger value="media" className="text-xs">이미지 & 갤러리</TabsTrigger>
                        <TabsTrigger value="settings" className="text-xs">상세 설정</TabsTrigger>
                        {item.category === 'COMMERCE' && (
                          <TabsTrigger value="commerce" className="text-xs">라이브커머스 설정</TabsTrigger>
                        )}
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>제목</Label>
                          <Input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })} className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            {item.category === 'BRAND PHOTO' 
                              ? '인스타그램 / 외부 링크 URL (Instagram Link)' 
                              : '유튜브 Embed / 영상 링크 URL'}
                          </Label>
                          <Input 
                            value={item.videoUrl} 
                            onChange={e => updateItem(item.id, { videoUrl: e.target.value })} 
                            className="bg-zinc-950 border-zinc-800" 
                            placeholder={item.category === 'BRAND PHOTO' 
                              ? "예: https://www.instagram.com/p/..." 
                              : "예: https://www.youtube.com/embed/... 또는 인스타그램 URL"}
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {item.category === 'BRAND PHOTO'
                              ? '인스타그램 URL을 입력하면 포트폴리오 카드 및 갤러리 모달창에 "Instagram 바로가기" 버튼이 표시됩니다.'
                              : '유튜브 임베드 주소 또는 인스타그램 링크를 입력할 수 있습니다.'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>상세 설명</Label>
                          <textarea 
                            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                            value={item.description} 
                            onChange={e => updateItem(item.id, { description: e.target.value })} 
                          />
                        </div>
                        <div className="space-y-2">
                           <Label>역할 및 업무 (Role & Tasks)</Label>
                           <Input value={item.role || ''} onChange={e => updateItem(item.id, { role: e.target.value })} className="bg-zinc-950 border-zinc-800" placeholder="예: 촬영 및 편집 스태프" />
                        </div>
                      </TabsContent>

                      <TabsContent value="media" className="space-y-6 pt-2">
                        <div className="space-y-4">
                          <Label>썸네일 이미지 (대표 이미지 / CI)</Label>
                          <div className="space-y-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div className="flex items-end gap-6">
                              <div className="w-40 aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black shadow-inner">
                                <img 
                                  src={getProcessedImageUrl(item.thumbnailUrl || (item.videoUrl ? `https://img.youtube.com/vi/${getYoutubeId(item.videoUrl)}/maxresdefault.jpg` : ''))} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <label className="liquid-glass px-4 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-xs font-bold border border-white/10 flex items-center gap-1.5">
                                  <Plus className="w-3 h-3" />
                                  직접 업로드
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const compressed = await compressImage(file, 900, 0.65);
                                      updateItem(item.id, { thumbnailUrl: compressed });
                                    }}
                                  />
                                </label>
                                <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg cursor-pointer transition-colors text-xs font-bold border border-zinc-700 flex items-center gap-1.5">
                                  <CropIcon className="w-3 h-3" />
                                  크롭 업로드
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const compressed = await compressImage(file, 900, 0.65);
                                      setImageToCrop(compressed);
                                      setAspect(16 / 9);
                                      setCroppingTarget({ type: 'thumbnail', itemId: item.id });
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] text-zinc-500 tracking-widest">Image Source Link</Label>
                               <Input 
                                 value={item.thumbnailUrl || ''} 
                                 onChange={e => updateItem(item.id, { thumbnailUrl: e.target.value })} 
                                 className="bg-zinc-900 border-zinc-800 text-xs" 
                                 placeholder="이미지 URL 직접 입력" 
                               />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <Label>추가 갤러리 이미지 (Photos)</Label>
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {item.images?.map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-zinc-950 border border-zinc-800 group">
                                <img src={getProcessedImageUrl(url)} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                  <button 
                                    onClick={() => {
                                      setImageToCrop(url);
                                      setAspect(0);
                                      setCroppingTarget({ type: 'gallery', itemId: item.id, imageIndex: idx });
                                    }}
                                    className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                                  >
                                    <CropIcon className="w-3.5 h-3.5 text-white" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newImages = [...(item.images || [])];
                                      newImages.splice(idx, 1);
                                      updateItem(item.id, { images: newImages });
                                    }}
                                    className="p-1.5 hover:bg-red-500 rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-white" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <label className="aspect-square rounded-md border border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-950 transition-colors">
                              <Plus className="w-4 h-4 text-zinc-500 mb-1" />
                              <span className="text-[10px] text-zinc-500">Add</span>
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const files = e.target.files;
                                  if (!files || files.length === 0) return;
                                  
                                  const addedImages: string[] = [];
                                  for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    const compressed = await compressImage(file, 900, 0.65);
                                    addedImages.push(compressed);
                                  }
                                  updateItem(item.id, { images: [...(item.images || []), ...addedImages] });
                                }}
                              />
                            </label>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] text-zinc-500 tracking-widest">Multi-link Import (Row by row)</Label>
                            <textarea 
                              className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-md p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-zinc-700"
                              value={item.images?.join('\n') || ''}
                              onChange={e => updateItem(item.id, { images: e.target.value.split('\n').filter(url => url.trim() !== '') })}
                              placeholder="https://image1.jpg&#10;https://image2.jpg"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-6 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>카테고리 (Category)</Label>
                            <Input value={item.category} onChange={e => updateItem(item.id, { category: e.target.value })} className="bg-zinc-950 border-zinc-800" />
                          </div>
                          <div className="space-y-2">
                            <Label>정렬 순서 (Order)</Label>
                            <Input type="number" value={item.order} onChange={e => updateItem(item.id, { order: parseInt(e.target.value) })} className="bg-zinc-950 border-zinc-800" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>그룹/시리즈 이름 (Series Grouping)</Label>
                          <Input 
                            value={item.group || ''} 
                            onChange={e => updateItem(item.id, { group: e.target.value })} 
                            className="bg-zinc-950 border-zinc-800"
                            placeholder="예: SONY a7c2 [제주]"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">동일한 그룹 이름을 가진 영상들은 사이트에서 하나의 시리즈로 묶여서 표시됩니다.</p>
                        </div>
                      </TabsContent>

                      {item.category === 'COMMERCE' && (
                        <TabsContent value="commerce" className="space-y-6 pt-2">
                          <div className="p-4 rounded-xl bg-violet-950/10 border border-violet-500/20 space-y-4">
                            <Label className="text-violet-400 font-extrabold uppercase tracking-widest text-xs flex items-center gap-1.5">
                              ✍️ 라이브 송출 제목 재배열 (Title Arranger)
                            </Label>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <Label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">첫 번째 줄 (Line 1)</Label>
                                <Input 
                                  value={(item.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n')[0] || ""}
                                  onChange={(e) => {
                                    const parts = (item.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n');
                                    parts[0] = e.target.value;
                                    updateItem(item.id, { commerceSection1Title: parts.join('\n') });
                                  }}
                                  placeholder="예: 현장의 생동감을 실시간으로"
                                  className="bg-zinc-950 border-zinc-800"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">두 번째 줄 (Line 2)</Label>
                                <Input 
                                  value={(item.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n')[1] || ""}
                                  onChange={(e) => {
                                    const parts = (item.commerceSection1Title || "현장의 생동감을 실시간으로 전달하는\n독보적인 라이브 송출 전략").split('\n');
                                    parts[1] = e.target.value;
                                    updateItem(item.id, { commerceSection1Title: parts.join('\n') });
                                  }}
                                  placeholder="예: 독보적인 라이브 송출 전략"
                                  className="bg-zinc-950 border-zinc-800"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] text-zinc-400 font-semibold block">추천 문장 배열 예시 (클릭하여 즉시 적용)</span>
                              <div className="flex flex-col gap-2">
                                {[
                                  "현장의 생동감을 실시간으로\n독보적인 라이브 송출 전략",
                                  "실시간 라이브의 생동감을 온전히\n브랜드를 위한 원스톱 송출 솔루션",
                                  "타협 없는 고화질 생중계\n완벽한 무중단 라이브 스트리밍",
                                  "시청자와 소통하는 생생한 현장\n감각적인 연출과 안정적인 송출"
                                ].map((preset, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => updateItem(item.id, { commerceSection1Title: preset })}
                                    className="text-left text-xs px-3 py-2 rounded bg-zinc-950 border border-zinc-800 hover:border-violet-500/30 hover:bg-violet-500/5 text-zinc-350 hover:text-white transition-all font-medium leading-normal flex items-start gap-1.5"
                                  >
                                    <span className="text-violet-400 font-bold">#{idx + 1}</span>
                                    <span className="whitespace-pre-line">{preset}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>실시간 라이브 송출 부제 / 리드 설명</Label>
                            <textarea 
                              rows={3}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                              value={item.commerceSection1Lead || ""}
                              onChange={e => updateItem(item.id, { commerceSection1Lead: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>기술 스펙 해상도 (Resolution)</Label>
                            <Input 
                              value={item.commerceResolution || ""}
                              onChange={e => updateItem(item.id, { commerceResolution: e.target.value })}
                              className="bg-zinc-950 border-zinc-800"
                              placeholder="예: 1080p FHD Transmission"
                            />
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={addItem} className="h-full border-dashed border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-500">
                <Plus className="w-6 h-6 mr-2" /> 새 영상 추가
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

          <TabsContent value="about">
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>이름 (Name)</Label>
                    <Input 
                      value={localData.name}
                      onChange={e => setLocalData({ ...localData, name: e.target.value })}
                      className="bg-zinc-950 border-zinc-800" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>직함 (Role / JEON SEUNG MOON 등)</Label>
                    <Input 
                      value={localData.role}
                      onChange={e => setLocalData({ ...localData, role: e.target.value })}
                      className="bg-zinc-950 border-zinc-800" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>페이지 메인 헤드라인 (Headline)</Label>
                  <Input 
                    value={localData.aboutHeadline}
                    onChange={e => setLocalData({ ...localData, aboutHeadline: e.target.value })}
                    className="bg-zinc-950 border-zinc-800" 
                  />
                </div>
                  <div className="space-y-4">
                    <Label>페이지 메인 배경 이미지 (Hero Image)</Label>
                    <div className="space-y-3">
                      <div className="flex items-end gap-6">
                        <div className="w-40 aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                          <img src={getProcessedImageUrl(localData.heroImage)} className="w-full h-full object-cover" />
                        </div>
                        <label className="liquid-glass px-6 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-xs font-bold border border-white/10">
                          사진 변경
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImageToCrop(reader.result as string);
                                setAspect(16 / 9);
                                setCroppingTarget({ type: 'hero' });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      <Input 
                        value={localData.heroImage}
                        onChange={e => setLocalData(prev => ({ ...prev, heroImage: e.target.value }))}
                        placeholder="이미지 URL 직접 입력"
                        className="bg-zinc-950 border-zinc-800 text-xs"
                      />
                    </div>
                  </div>
                <div className="space-y-2">
                  <Label>About (자기소개)</Label>
                  <textarea 
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    value={localData.about}
                    onChange={e => setLocalData({ ...localData, about: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Goal (목표)</Label>
                  <textarea 
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    value={localData.goal}
                    onChange={e => setLocalData({ ...localData, goal: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      value={localData.contact.email}
                      onChange={e => setLocalData({ ...localData, contact: { ...localData.contact, email: e.target.value } })}
                      className="bg-zinc-950 border-zinc-800" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={localData.contact.phone}
                      onChange={e => setLocalData({ ...localData, contact: { ...localData.contact, phone: e.target.value } })}
                      className="bg-zinc-950 border-zinc-800" 
                    />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-zinc-800 space-y-4">
                  <Label>섹션 제목 관리 (Section Titles)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-zinc-500">Works (최상단 헤드라인)</Label>
                      <Input 
                        value={localData.sectionTitles?.works || 'Activity History'} 
                        onChange={e => setLocalData({
                          ...localData,
                          sectionTitles: { ...(localData.sectionTitles || {}), works: e.target.value }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] text-zinc-500">Experience (경력)</Label>
                       <Input 
                         value={localData.sectionTitles?.experience || 'Experience Journey'} 
                         onChange={e => setLocalData({
                           ...localData,
                           sectionTitles: { ...(localData.sectionTitles || {}), experience: e.target.value }
                         })}
                         className="bg-zinc-950 border-zinc-800"
                       />
                    </div>
                    <div className="space-y-2 col-span-2">
                       <Label className="text-[10px] text-zinc-500">Contact 메인 문구 (Footer Headline)</Label>
                       <Input 
                         value={localData.sectionTitles?.contactHeadline || "Let's Build Something Great"} 
                         onChange={e => setLocalData({
                           ...localData,
                           sectionTitles: { ...(localData.sectionTitles || {}), contactHeadline: e.target.value }
                         })}
                         className="bg-zinc-950 border-zinc-800"
                       />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <Label className="mb-4 block">통계 수치 (Stats)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {localData.stats.map((stat, idx) => (
                      <div key={stat.id} className="space-y-2 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                        <Label className="text-[10px] text-zinc-500">통계 {idx + 1}</Label>
                        <Input 
                          placeholder="수치 (예: 10+)" 
                          value={stat.value} 
                          onChange={e => {
                            const newStats = [...localData.stats];
                            newStats[idx] = { ...stat, value: e.target.value };
                            setLocalData({ ...localData, stats: newStats });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-8 text-sm" 
                        />
                        <Input 
                          placeholder="라벨 (예: PROJECTS)" 
                          value={stat.label} 
                          onChange={e => {
                            const newStats = [...localData.stats];
                            newStats[idx] = { ...stat, label: e.target.value };
                            setLocalData({ ...localData, stats: newStats });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-8 text-sm" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Contact Styling Control Section */}
                <div className="pt-8 border-t border-zinc-800 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-2">Direct Contact 스타일 및 텍스트 편집</h3>
                    <p className="text-xs text-zinc-500">Contact 섹션의 모든 텍스트 내용과 폰트 크기, 굵기, 기울임꼴, 색상을 자유롭게 변경할 수 있습니다.</p>
                  </div>

                  {/* 1. Sub-title / Badge */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">서브 배지 (Sub-title Badge)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">배지 텍스트 (Badge Text)</Label>
                        <Input 
                          value={localData.contactStyles?.badgeText ?? "Direct Contact"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeText: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 크기 (Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.badgeFontSize ?? "text-xs"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-[10px]">Very Small (10px)</option>
                          <option value="text-xs">Small (12px / Default)</option>
                          <option value="text-sm">Medium (14px)</option>
                          <option value="text-base">Large (16px)</option>
                          <option value="text-lg">X-Large (18px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 굵기 (Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.badgeFontWeight ?? "font-bold"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold (Default)</option>
                          <option value="font-black">Black / Heavy</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">스타일 (Font Style)</Label>
                        <select 
                          value={localData.contactStyles?.badgeFontStyle ?? "not-italic"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeFontStyle: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="not-italic">Normal (Default)</option>
                          <option value="italic">Italic (기울임)</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] text-zinc-500">텍스트 색상 (Color)</Label>
                        <select 
                          value={localData.contactStyles?.badgeColor ?? "text-violet-500"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeColor: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-violet-500">Violet (Purple / Default)</option>
                          <option value="text-emerald-400">Emerald (Green)</option>
                          <option value="text-rose-450">Rose (Red)</option>
                          <option value="text-sky-400">Sky Blue</option>
                          <option value="text-yellow-400">Amber Yellow</option>
                          <option value="text-white">Pure White</option>
                          <option value="text-slate-400">Slate Gray</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">자간 (Letter Spacing)</Label>
                        <select 
                          value={localData.contactStyles?.badgeTracking ?? "tracking-[0.3em]"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeTracking: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
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
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">전체 정렬 배치 (Alignment)</Label>
                        <select 
                          value={localData.contactStyles?.badgeAlign ?? "left"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, badgeAlign: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="left">Left (왼쪽 정렬 / 기본값)</option>
                          <option value="center">Center (중앙 정렬 / 대칭 배치)</option>
                          <option value="right">Right (오른쪽 정렬)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. Headline */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">메인 헤드라인 (Main Headline)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] text-zinc-500">헤드라인 텍스트 (Headline Text) - 줄바꿈은 \n 으로 구분</Label>
                        <Input 
                          value={localData.contactStyles?.headlineText ?? localData.sectionTitles?.contactHeadline ?? "Let's Build \nSomething Great"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, headlineText: e.target.value },
                              sectionTitles: { ...(localData.sectionTitles || {}), contactHeadline: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 크기 (Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.headlineFontSize ?? "text-5xl md:text-7xl"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, headlineFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-3xl md:text-4xl">Small (3xl/4xl)</option>
                          <option value="text-4xl md:text-5xl">Medium (4xl/5xl)</option>
                          <option value="text-5xl md:text-6xl">Large (5xl/6xl)</option>
                          <option value="text-5xl md:text-7xl">X-Large (5xl/7xl / Default)</option>
                          <option value="text-6xl md:text-8xl">XX-Large (6xl/8xl)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 굵기 (Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.headlineFontWeight ?? "font-black"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, headlineFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-normal">Normal</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold</option>
                          <option value="font-extrabold">Extra Bold</option>
                          <option value="font-black">Black (Default)</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] text-zinc-500">스타일 (Font Style)</Label>
                        <select 
                          value={localData.contactStyles?.headlineFontStyle ?? "not-italic"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, headlineFontStyle: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="not-italic">Normal (Default)</option>
                          <option value="italic">Italic (기울임)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Email Info */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">이메일 정보 (Email Info)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">이메일 라벨 (Email Label)</Label>
                        <Input 
                          value={localData.contactStyles?.emailLabelText ?? "Email Address"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, emailLabelText: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">라벨 글꼴 크기 (Label Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.emailLabelFontSize ?? "text-[10px]"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, emailLabelFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-[9px]">Tiny (9px)</option>
                          <option value="text-[10px]">Small (10px / Default)</option>
                          <option value="text-xs">Medium (12px)</option>
                          <option value="text-sm">Large (14px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">값 글꼴 크기 (Value Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.emailValueFontSize ?? "text-xl md:text-2xl"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, emailValueFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-sm">Small (14px)</option>
                          <option value="text-base">Medium (16px)</option>
                          <option value="text-lg">Large (18px)</option>
                          <option value="text-xl">X-Large (20px)</option>
                          <option value="text-xl md:text-2xl">XX-Large (20-24px / Default)</option>
                          <option value="text-2xl md:text-3xl">3X-Large (24-30px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">값 굵기 (Value Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.emailValueFontWeight ?? "font-bold"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, emailValueFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold (Default)</option>
                          <option value="font-black">Black</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 4. Phone Info */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">연락처 정보 (Mobile Info)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">연락처 라벨 (Mobile Label)</Label>
                        <Input 
                          value={localData.contactStyles?.phoneLabelText ?? "Mobile"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, phoneLabelText: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">라벨 글꼴 크기 (Label Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.phoneLabelFontSize ?? "text-[10px]"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, phoneLabelFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-[9px]">Tiny (9px)</option>
                          <option value="text-[10px]">Small (10px / Default)</option>
                          <option value="text-xs">Medium (12px)</option>
                          <option value="text-sm">Large (14px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">값 글꼴 크기 (Value Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.phoneValueFontSize ?? "text-xl md:text-2xl"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, phoneValueFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-sm">Small (14px)</option>
                          <option value="text-base">Medium (16px)</option>
                          <option value="text-lg">Large (18px)</option>
                          <option value="text-xl">X-Large (20px)</option>
                          <option value="text-xl md:text-2xl">XX-Large (20-24px / Default)</option>
                          <option value="text-2xl md:text-3xl">3X-Large (24-30px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">값 굵기 (Value Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.phoneValueFontWeight ?? "font-bold"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, phoneValueFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold (Default)</option>
                          <option value="font-black">Black</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 5. CTA Button */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">메일 전송 버튼 (CTA Button)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">버튼 텍스트 (Button Text)</Label>
                        <Input 
                          value={localData.contactStyles?.buttonText ?? "Send Direct Mail"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, buttonText: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">버튼 글꼴 크기 (Button Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.buttonFontSize ?? "text-sm"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, buttonFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-xs">Small (12px)</option>
                          <option value="text-sm">Medium (14px / Default)</option>
                          <option value="text-base">Large (16px)</option>
                          <option value="text-lg">X-Large (18px)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">버튼 글꼴 굵기 (Button Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.buttonFontWeight ?? "font-black"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, buttonFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold</option>
                          <option value="font-black">Black (Default)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 스타일 (Button Font Style)</Label>
                        <select 
                          value={localData.contactStyles?.buttonFontStyle ?? "not-italic"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, buttonFontStyle: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="not-italic">Normal (Default)</option>
                          <option value="italic">Italic (기울임)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 6. Motto / Connection Phrase */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold text-white">모토/연결고리 문구 (Motto Phrase)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] text-zinc-500">문구 내용 (Motto Text)</Label>
                        <Input 
                          value={localData.contactStyles?.mottoText ?? "'연결'을 모토로 삼아 다양한 연결고리로서의 역할을 하겠습니다."}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoText: e.target.value }
                            });
                          }}
                          className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 크기 (Font Size)</Label>
                        <select 
                          value={localData.contactStyles?.mottoFontSize ?? "text-base md:text-lg"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoFontSize: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="text-xs md:text-sm">Small (text-xs/sm)</option>
                          <option value="text-sm md:text-base">Medium (text-sm/base)</option>
                          <option value="text-base md:text-lg">Large (text-base/lg / Default)</option>
                          <option value="text-lg md:text-xl">X-Large (text-lg/xl)</option>
                          <option value="text-xl md:text-2xl">XX-Large (text-xl/2xl)</option>
                          <option value="text-2xl md:text-3xl">3X-Large (text-2xl/3xl)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">자간 (Letter Spacing)</Label>
                        <select 
                          value={localData.contactStyles?.mottoTracking ?? "tracking-normal"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoTracking: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="tracking-tighter">Tighter (자간 매우 좁음)</option>
                          <option value="tracking-tight">Tight (자간 좁음)</option>
                          <option value="tracking-normal">Normal (자간 보통 / Default)</option>
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
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 종류 (Font Family)</Label>
                        <select 
                          value={localData.contactStyles?.mottoFontFamily ?? "font-sans"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoFontFamily: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-sans">Sans-serif (Inter / 기본값)</option>
                          <option value="font-serif">Serif (Playfair Display)</option>
                          <option value="font-mono">Monospace (JetBrains Mono)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 굵기 (Font Weight)</Label>
                        <select 
                          value={localData.contactStyles?.mottoFontWeight ?? "font-medium"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoFontWeight: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="font-light">Light</option>
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium (Default)</option>
                          <option value="font-semibold">Semibold</option>
                          <option value="font-bold">Bold</option>
                          <option value="font-extrabold">Extra Bold</option>
                          <option value="font-black">Black</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-zinc-500">글꼴 스타일 (Font Style)</Label>
                        <select 
                          value={localData.contactStyles?.mottoFontStyle ?? "not-italic"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoFontStyle: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
                        >
                          <option value="not-italic">Normal (Default)</option>
                          <option value="italic">Italic (기울임)</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] text-zinc-500">텍스트 색상 (Text Color)</Label>
                        <select 
                          value={localData.contactStyles?.mottoColor ?? "text-zinc-400"}
                          onChange={e => {
                            const styles = localData.contactStyles || {};
                            setLocalData({
                              ...localData,
                              contactStyles: { ...styles, mottoColor: e.target.value }
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none h-9"
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experience">
             <div className="space-y-4">
               {localData.experiences.map(exp => (
                 <Card key={exp.id} className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <CardContent className="pt-6 flex gap-4">
                     <div className="flex-1 space-y-4">
                        <Input value={exp.title} onChange={e => setLocalData({...localData, experiences: localData.experiences.map(x => x.id === exp.id ? {...x, title: e.target.value} : x)})} className="bg-zinc-950 border-zinc-800" placeholder="경력 제목" />
                        <Input value={exp.period} onChange={e => setLocalData({...localData, experiences: localData.experiences.map(x => x.id === exp.id ? {...x, period: e.target.value} : x)})} className="bg-zinc-950 border-zinc-800" placeholder="기간" />
                        <textarea 
                          className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm"
                          value={exp.description}
                          onChange={e => setLocalData({...localData, experiences: localData.experiences.map(x => x.id === exp.id ? {...x, description: e.target.value} : x)})}
                          placeholder="설명"
                        />
                     </div>
                     <Button variant="ghost" size="icon" onClick={() => setLocalData({...localData, experiences: localData.experiences.filter(x => x.id !== exp.id)})} className="text-zinc-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </CardContent>
                 </Card>
               ))}
               <Button variant="outline" onClick={() => setLocalData({...localData, experiences: [...localData.experiences, {id: Math.random().toString(), title: '', description: '', period: ''}]})} className="w-full border-dashed border-zinc-800 bg-transparent hover:bg-zinc-900">
                  <Plus className="w-4 h-4 mr-2" /> 경력 추가
               </Button>
             </div>
          </TabsContent>

          <TabsContent value="gear">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {localData.gear.map(g => (
                 <Card key={g.id} className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <CardContent className="pt-6 flex gap-4">
                     <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-950 border border-zinc-800 relative group">
                        <img src={getProcessedImageUrl(g.imageUrl)} className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Plus className="w-4 h-4 text-white" />
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImageToCrop(reader.result as string);
                                setAspect(1);
                                setCroppingTarget({ type: 'gear', gearId: g.id });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                     </div>
                     <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-zinc-500 uppercase tracking-widest">장비 정보</Label>
                        <Input value={g.name} onChange={e => setLocalData({...localData, gear: localData.gear.map(x => x.id === g.id ? {...x, name: e.target.value} : x)})} className="bg-zinc-950 border-zinc-800" placeholder="장비 이름 (예: SONY a7c2)" />
                        <Input value={g.imageUrl} onChange={e => setLocalData({...localData, gear: localData.gear.map(x => x.id === g.id ? {...x, imageUrl: e.target.value} : x)})} className="bg-zinc-950 border-zinc-800 text-[10px] h-7" placeholder="이미지 URL 주소" />
                     </div>
                     <Button variant="ghost" size="icon" onClick={() => setLocalData({...localData, gear: localData.gear.filter(x => x.id !== g.id)})} className="text-zinc-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </CardContent>
                 </Card>
               ))}
               <Button variant="outline" onClick={() => setLocalData({...localData, gear: [...localData.gear, {id: Math.random().toString(), name: '', imageUrl: ''}]})} className="w-full border-dashed border-zinc-800 bg-transparent hover:bg-zinc-900 h-24">
                  <Plus className="w-4 h-4 mr-2" /> 장비 추가
               </Button>
             </div>
          </TabsContent>

          <TabsContent value="bts">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {localData.btsImages.map((img, idx) => (
                  <Card key={img.id} className="bg-zinc-900 border-zinc-800 text-zinc-100 overflow-hidden group relative">
                    <img src={getProcessedImageUrl(img.url)} className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                       <Button 
                         variant="secondary" 
                         size="sm" 
                         onClick={() => {
                           setImageToCrop(img.url);
                           setAspect(4 / 3);
                           setCroppingTarget({ type: 'bts', imageIndex: idx });
                         }}
                         className="w-24 bg-white/10 hover:bg-white/20 text-white border-white/10"
                       >
                         수정
                       </Button>
                       <Button 
                         variant="destructive" 
                         size="sm" 
                         onClick={() => setLocalData({...localData, btsImages: localData.btsImages.filter(i => i.id !== img.id)})}
                         className="w-24"
                       >
                         삭제
                       </Button>
                    </div>
                    <CardContent className="pt-4 space-y-2">
                       <Input value={img.url} onChange={e => setLocalData({...localData, btsImages: localData.btsImages.map(i => i.id === img.id ? {...i, url: e.target.value} : i)})} className="bg-zinc-950 border-zinc-800 text-[10px]" placeholder="Image URL" />
                       <Input value={img.caption || ''} onChange={e => setLocalData({...localData, btsImages: localData.btsImages.map(i => i.id === img.id ? {...i, caption: e.target.value} : i)})} className="bg-zinc-950 border-zinc-800 text-[10px]" placeholder="캡션 (설명)" />
                    </CardContent>
                  </Card>
                ))}
                <label className="h-40 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors">
                  <Plus className="w-6 h-6 text-zinc-500 mb-2" />
                  <span className="text-sm text-zinc-500 font-medium tracking-tight">현장 사진 추가</span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      
                      const newBtsImages = [...localData.btsImages];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const compressed = await compressImage(file, 900, 0.65);
                        newBtsImages.push({
                          id: `bts-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                          url: compressed,
                          caption: ''
                        });
                      }
                      setLocalData({ ...localData, btsImages: newBtsImages });
                    }}
                  />
                </label>
             </div>
          </TabsContent>
        </Tabs>

        {/* Image Cropper Modal */}
        {imageToCrop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl h-[80vh] bg-zinc-900 rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CropIcon className="w-5 h-5 text-violet-500" />
                    이미지 편집
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">마우스로 드래그하여 영역을 선택하세요</p>
                </div>
                <button onClick={() => setImageToCrop(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X />
                </button>
              </div>
              
              <div className="relative flex-1 bg-black overflow-hidden m-4 rounded-xl border border-white/5">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect || undefined}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-8 border-t border-white/5 bg-zinc-900/50 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase block">Aspect Ratio</span>
                    <div className="flex gap-2">
                      <Button 
                        variant={aspect === 16/9 ? "default" : "outline"} 
                        onClick={() => setAspect(16 / 9)}
                        className={`text-[10px] h-8 px-3 rounded-lg border-white/5 ${aspect === 16/9 ? "bg-violet-600" : "bg-white/5 hover:bg-white/10 text-zinc-400 font-bold"}`}
                      >
                        16:9 Landscape
                      </Button>
                      <Button 
                        variant={aspect === 4/5 ? "default" : "outline"} 
                        onClick={() => setAspect(4 / 5)}
                        className={`text-[10px] h-8 px-3 rounded-lg border-white/5 ${aspect === 4/5 ? "bg-violet-600" : "bg-white/5 hover:bg-white/10 text-zinc-400 font-bold"}`}
                      >
                        4:5 Portrait
                      </Button>
                      <Button 
                        variant={aspect === 1 ? "default" : "outline"} 
                        onClick={() => setAspect(1)}
                        className={`text-[10px] h-8 px-3 rounded-lg border-white/5 ${aspect === 1 ? "bg-violet-600" : "bg-white/5 hover:bg-white/10 text-zinc-400 font-bold"}`}
                      >
                        1:1 Square
                      </Button>
                      <Button 
                        variant={aspect === 0 ? "default" : "outline"} 
                        onClick={() => setAspect(0)}
                        className={`text-[10px] h-8 px-3 rounded-lg border-white/5 ${aspect === 0 ? "bg-violet-600" : "bg-white/5 hover:bg-white/10 text-zinc-400 font-bold"}`}
                      >
                        Free
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase block">확대/축소</span>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-violet-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setImageToCrop(null)}
                    className="flex-1 py-6 bg-transparent border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold"
                  >
                    취소
                  </Button>
                  <Button 
                    onClick={handleCropSave}
                    className="flex-[2] py-6 bg-violet-600 hover:bg-violet-700 text-white font-bold"
                  >
                    확인 및 적용
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
