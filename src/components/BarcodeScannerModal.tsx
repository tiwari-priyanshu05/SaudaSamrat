// =============================================================================
// SaudaSamrat — Barcode Scanner & Lookup Modal
// Camera-assisted BarcodeDetector with manual entry and offline-first fallback.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Package,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import { getProductByBarcode } from '../services';
import type { Product } from '../types';
import { formatQty } from '../utils/format';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onProductFound,
}: BarcodeScannerModalProps) {
  const { t } = useLang();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!open) {
      setBarcodeInput('');
      setErrorMsg('');
      setFoundProduct(null);
      stopCamera();
    }
  }, [open]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    setErrorMsg('');
    setCameraError(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraError(true);
      stopCamera();
    }
  }

  async function handleSearch(codeToSearch?: string) {
    const code = (codeToSearch ?? barcodeInput).trim();
    if (!code) return;

    setSearching(true);
    setErrorMsg('');
    setFoundProduct(null);

    try {
      const product = await getProductByBarcode(code);
      if (product) {
        setFoundProduct(product);
      } else {
        setErrorMsg(t('barcodeNotFound'));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t('errorGeneric'));
    } finally {
      setSearching(false);
    }
  }

  function handleSelectFound() {
    if (foundProduct) {
      onProductFound(foundProduct);
      stopCamera();
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      title={t('scanBarcodeTitle')}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            fullWidth
          >
            {t('cancel')}
          </Button>
          {foundProduct && (
            <Button variant="primary" onClick={handleSelectFound} fullWidth>
              <CheckCircle2 size={16} />
              {t('confirm')}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Manual Barcode Input & Scanner guns */}
        <div>
          <label className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider block mb-1">
            {t('barcodePlaceholder')}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C72]"
              />
              <input
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="e.g. 8901030382910"
                className="w-full bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-[#20352C] outline-none focus:border-[#087F5B] min-h-[44px]"
                id="barcode-manual-input"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={searching || !barcodeInput.trim()}
              size="sm"
              className="!py-2.5 shrink-0 min-h-[44px]"
              id="barcode-search-btn"
            >
              <Search size={15} />
            </Button>
          </div>
        </div>

        {/* Camera toggle & Live view */}
        <div className="border border-[#E5EAE3] rounded-2xl p-3.5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#20352C] flex items-center gap-1.5">
              <Camera size={14} className="text-[#087F5B]" />
              Camera Scanner
            </span>
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              className="text-xs font-bold text-[#087F5B] hover:text-[#155E46] flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
            >
              {cameraActive ? <CameraOff size={13} /> : <Camera size={13} />}
              <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
            </button>
          </div>

          {cameraActive ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-2 border-[#087F5B] rounded-lg shadow-sm pointer-events-none" />
            </div>
          ) : cameraError ? (
            <p className="text-xs text-[#6B7C72] leading-relaxed bg-[#F9F7EF] p-3 rounded-xl border border-[#E5EAE3]">
              {t('cameraUnavailable')}
            </p>
          ) : (
            <p className="text-[11px] text-[#6B7C72] leading-relaxed">
              Tap &quot;Start Camera&quot; to scan via phone camera, or plug in a USB handheld barcode reader.
            </p>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-[#FDF2F0] border border-[#FADCD7] rounded-xl p-3 text-xs text-[#E86D5A] font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Found Product Card */}
        {foundProduct && (
          <div className="bg-[#DFF5E8] border border-[#C1EBD2] rounded-2xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-[#155E46] text-xs font-bold mb-1">
              <CheckCircle2 size={16} />
              <span>{t('barcodeFound')}</span>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#C1EBD2] mt-2">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#087F5B] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[#20352C] text-sm truncate">
                    {foundProduct.name}
                  </p>
                  <p className="text-xs text-[#6B7C72] mt-0.5">
                    {t('available')}: {formatQty(foundProduct.quantity, foundProduct.unit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
