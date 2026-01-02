#!/usr/bin/env node

/**
 * Building Forge - Update Server
 * 
 * خادم التحديثات البسيط مع:
 * - خدمة ملفات التحديث
 * - التحقق من التوقيعات
 * - إحصائيات التحميل
 * - دعم CDN
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

class UpdateServer {
  constructor(options = {}) {
    this.options = {
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      releaseDir: process.env.RELEASE_DIR || path.join(__dirname, '..', 'release'),
      publicKey: process.env.PUBLIC_KEY,
      enableStats: process.env.ENABLE_STATS !== 'false',
      enableCDN: process.env.ENABL