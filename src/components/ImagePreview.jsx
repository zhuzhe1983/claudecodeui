import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { api } from '../utils/api';
import { t } from '../utils/i18n';

const ImagePreview = ({ file, projectName, onClose, className }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadImage();
  }, [file, projectName]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For local files, create blob URL
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
      } else if (file && projectName) {
        // For project files, fetch from server
        const response = await api.readFile(projectName, file);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          throw new Error('Failed to load image');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up blob URL on unmount
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = typeof file === 'string' ? file.split('/').pop() : file.name;
      a.click();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getImageName = () => {
    if (typeof file === 'string') {
      return file.split('/').pop();
    }
    return file?.name || 'Image';
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background",
      isFullscreen && "fixed inset-0 z-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {getImageName()}
          </span>
          {!loading && !error && imageUrl && (
            <span className="text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {!loading && !error && imageUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-7 w-7"
                title={t('zoomOut')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-7 w-7"
                title={t('zoomIn')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="h-7 w-7"
                title={t('rotate')}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-7 w-7"
                title={t('download')}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-7 w-7"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          
          {/* Close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              title={t('close')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Image container */}
      <div className="flex-1 overflow-auto bg-muted/20 p-4">
        <div className="image-preview-container min-h-full">
          {loading && (
            <div className="text-muted-foreground">{t('loadingImage')}</div>
          )}
          
          {error && (
            <div className="text-destructive">
              <p className="font-medium">{t('failedToLoadImage')}</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
          
          {!loading && !error && imageUrl && (
            <img
              src={imageUrl}
              alt={getImageName()}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
                maxWidth: zoom > 1 ? 'none' : '100%',
                cursor: zoom > 1 ? 'move' : 'default'
              }}
              draggable={zoom > 1}
              onError={() => setError('Failed to display image')}
            />
          )}
        </div>
      </div>
      
      {/* Status bar */}
      {!loading && !error && imageUrl && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Image</span>
            <span>{getImageName()}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            {rotation !== 0 && <span>Rotation: {rotation}°</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;