import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { useLang } from '../i18n/LangContext';
import { saveShopProfile } from '../services';
import type { ShopProfile } from '../types';
import { ShieldCheck } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (profile: ShopProfile) => void;
  initial?: ShopProfile | null;
}

export function ProfileModal({ open, onClose, onSaved, initial }: ProfileModalProps) {
  const { t } = useLang();
  const [ownerName, setOwnerName] = useState(initial?.ownerName || '');
  const [shopName, setShopName] = useState(initial?.shopName || '');
  const [errors, setErrors] = useState<{ ownerName?: string; shopName?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOwnerName(initial?.ownerName || '');
      setShopName(initial?.shopName || '');
      setErrors({});
    }
  }, [open, initial]);

  function validate(): boolean {
    const errs: { ownerName?: string; shopName?: string } = {};
    const trimmedOwner = ownerName.trim();
    const trimmedShop = shopName.trim();

    if (!trimmedOwner) {
      errs.ownerName = t('errorOwnerNameRequired');
    } else if (trimmedOwner.length > 50) {
      errs.ownerName = t('errorNameTooLong');
    }

    if (!trimmedShop) {
      errs.shopName = t('errorShopNameRequired');
    } else if (trimmedShop.length > 60) {
      errs.shopName = t('errorShopNameTooLong');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const saved = await saveShopProfile({
        ownerName: ownerName.trim(),
        shopName: shopName.trim(),
      });
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ ownerName: t('errorGeneric') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={t('profileTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('ownerName')}
          value={ownerName}
          onChange={(e) => {
            setOwnerName(e.target.value);
            if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: undefined }));
          }}
          placeholder={t('ownerNamePlaceholder')}
          error={errors.ownerName}
          maxLength={50}
          required
          autoFocus
          id="profile-owner-name"
        />

        <Input
          label={t('shopName')}
          value={shopName}
          onChange={(e) => {
            setShopName(e.target.value);
            if (errors.shopName) setErrors((prev) => ({ ...prev, shopName: undefined }));
          }}
          placeholder={t('shopNamePlaceholder')}
          error={errors.shopName}
          maxLength={60}
          required
          id="profile-shop-name"
        />

        <div className="flex items-center gap-2 bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-3 text-xs text-[#6B7C72]">
          <ShieldCheck size={16} className="text-[#087F5B] shrink-0" />
          <span>{t('profileStorageNotice')}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            fullWidth
            className="!py-3"
            id="profile-cancel-btn"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            loading={saving}
            fullWidth
            className="!py-3 shadow-md shadow-[#087F5B]/20"
            id="profile-save-btn"
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
