// =============================================================================
// SaudaSamrat — Voice Assisted Sale Modal (Phase 9)
// Web Speech API with Hindi/English recognition, graceful typing fallback,
// and zero auto-commit safety verification drawer.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  AlertCircle,
  ShoppingCart,
  Search,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import { parseVoiceKiranaCommand, type ParsedVoiceResult } from '../services/voiceParser';
import type { Product } from '../types';
import { formatQty } from '../utils/format';

interface VoiceSaleModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onConfirm: (product: Product, quantity: number) => void;
}

// Browser SpeechRecognition definition
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function VoiceSaleModal({
  open,
  onClose,
  products,
  onConfirm,
}: VoiceSaleModalProps) {
  const { t, lang } = useLang();

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editQty, setEditQty] = useState<string>('1');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopListening();
      setTranscript('');
      setManualText('');
      setParsed(null);
      setSelectedProduct(null);
      setEditQty('1');
    }
  }, [open]);

  function startListening() {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Default to Hindi/India or English/India based on active language
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleProcessText(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function handleProcessText(text: string) {
    const res = parseVoiceKiranaCommand(text, products);
    setParsed(res);
    if (res.matchedProduct) {
      setSelectedProduct(res.matchedProduct);
      setEditQty(String(res.detectedQuantity));
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText.trim());
    handleProcessText(manualText.trim());
  }

  function handleComplete() {
    if (!selectedProduct) return;
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) return;
    onConfirm(selectedProduct, qty);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('voiceSale')}
    >
      <div className="space-y-4">
        {/* Help Banner */}
        <div className="p-3.5 bg-[#DFF5E8] border border-[#C1EBD2] rounded-2xl flex items-start gap-2.5 text-xs text-[#155E46]">
          <Sparkles size={16} className="shrink-0 mt-0.5 text-[#087F5B]" />
          <p className="font-semibold leading-relaxed">{t('voiceHelp')}</p>
        </div>

        {/* Microphone action or Fallback notice */}
        {speechSupported ? (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-[#E5EAE3] text-center shadow-2xs">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isListening
                  ? 'bg-[#E86D5A] text-white animate-pulse ring-4 ring-[#FADCD7]'
                  : 'bg-[#087F5B] hover:bg-[#155E46] text-white'
              }`}
              title={isListening ? t('stopListening') : t('startListening')}
            >
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            <p className="mt-3 text-xs font-bold text-[#20352C]">
              {isListening ? t('listening') : t('startListening')}
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-[#FFF4E0] border border-[#FFE3B3] rounded-2xl text-xs text-[#8D5300] flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#8D5300]" />
            <p className="font-medium leading-relaxed">{t('voiceUnsupported')}</p>
          </div>
        )}

        {/* Manual type fallback form */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={lang === 'hi' ? 'बोलने के बजाय यहाँ लिखें (जैसे: "2 किलो चीनी")' : 'Or type phrase here (e.g. "2 kg sugar")'}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E5EAE3] bg-[#F9F7EF] text-xs text-[#20352C] outline-none focus:border-[#087F5B] min-h-[44px]"
          />
          <Button type="submit" size="sm" variant="secondary" className="min-h-[44px]">
            <Search size={14} />
            {t('confirm')}
          </Button>
        </form>

        {/* Parsed Recognition Result & Explicit Confirmation */}
        {parsed && (
          <div className="p-4 bg-[#F9F7EF] rounded-2xl border border-[#E5EAE3] space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#E5EAE3] pb-2">
              <span className="text-[#6B7C72] font-semibold">
                {lang === 'hi' ? 'सुना गया वाक्य:' : 'Heard Phrase:'}
              </span>
              <span className="font-bold text-[#20352C] italic">
                &ldquo;{transcript}&rdquo;
              </span>
            </div>

            {/* Product selection */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                {t('parsedProduct')}
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === e.target.value);
                  setSelectedProduct(p || null);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5EAE3] text-sm font-bold text-[#20352C] bg-white outline-none focus:border-[#087F5B] min-h-[44px]"
              >
                <option value="">{lang === 'hi' ? 'सामान चुनें...' : 'Choose item...'}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatQty(p.quantity, p.unit)} {t('inStock')})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity adjustment */}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                    {t('parsedQuantity')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAE3] text-sm font-bold text-[#20352C] bg-white outline-none focus:border-[#087F5B] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                    {lang === 'hi' ? 'इकाई' : 'Unit'}
                  </label>
                  <div className="w-full px-3 py-2 rounded-xl border border-[#E5EAE3] text-sm font-bold text-[#6B7C72] bg-white flex items-center min-h-[44px]">
                    {selectedProduct.unit}
                  </div>
                </div>
              </div>
            )}

            {/* Safe Confirmation Button */}
            <div className="pt-2">
              <Button
                onClick={handleComplete}
                disabled={!selectedProduct || parseFloat(editQty) <= 0}
                fullWidth
                id="voice-confirm-sale-btn"
              >
                <ShoppingCart size={16} />
                {t('confirmSale')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
