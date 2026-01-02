/**
 * لوحة إدارة اختصارات لوحة المفاتيح - إصدار مبسط
 */

import React from 'react'
import './ShortcutManagerPanel.css'

export const ShortcutManagerPanel: React.FC = () => {
  return (
    <div className="shortcut-manager-panel">
      <div className="panel-header">
        <h3>إدارة الاختصارات</h3>
        <p>لوحة إدارة اختصارات لوحة المفاتيح</p>
      </div>

      <div className="panel-content">
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">حفظ المشروع</span>
              <span className="shortcut-description">حفظ المشروع الحالي</span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>S</kbd>
            </div>
          </div>

          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">فتح مشروع</span>
              <span className="shortcut-description">فتح مشروع موجود</span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>O</kbd>
            </div>
          </div>

          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">تراجع</span>
              <span className="shortcut-description">التراجع عن آخر عملية</span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>Z</kbd>
            </div>
          </div>

          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">إعادة</span>
              <span className="shortcut-description">
                إعادة آخر عملية تم التراجع عنها
              </span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>Y</kbd>
            </div>
          </div>

          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">نسخ</span>
              <span className="shortcut-description">نسخ العنصر المحدد</span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>C</kbd>
            </div>
          </div>

          <div className="shortcut-item">
            <div className="shortcut-info">
              <span className="shortcut-name">لصق</span>
              <span className="shortcut-description">لصق العنصر المنسوخ</span>
            </div>
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd> + <kbd>V</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
