/**
 * إعداد اختبارات التصدير
 * 
 * هذا الملف يحتوي على الإعدادات والمساعدات المطلوبة لاختبارات التصدير
 */

import { JSDOM } from 'jsdom';
import * as THREE from 'three';
import { TextDecoder, TextEncoder } from 'util';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// إعداد البيئة للاختبارات
export const setupExportTestEnvironment = () => {
    beforeAll(() => {
        // إعداد JSDOM للمتصفح الوهمي
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        // تعيين المتغيرات العامة
        global.window = dom.window as any;
        global.document = dom.window.document;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
        global.ImageData = dom.window.ImageData;
        global.TextEncoder = TextEncoder;
        global.TextDecoder = TextDecoder as any;

        // إعداد WebGL context وهمي
        setupMockWebGL();

        // إعداد File API وهمي
        setupMockFileAPI();

        // إعداد Canvas API وهمي
        setupMockCanvas();
    });

    afterAll(() => {
        // تنظيف البيئة
        cleanupTestEnvironment();
    });

    beforeEach(() => {
        // إعداد قبل كل اختبار
        setupTestCase();
    });

    afterEach(() => {
        // تنظيف بعد كل اختبار
        cleanupTestCase();
    });
};

/**
 * إعداد WebGL context وهمي
 */
const setupMockWebGL = () => {
    const mockWebGLContext = {
        canvas: {},
        drawingBufferWidth: 1024,
        drawingBufferHeight: 1024,
        getExtension: () => null,
        getParameter: (param: number) => {
            switch (param) {
                case 0x1F00: return 'Mock WebGL Vendor'; // GL_VENDOR
                case 0x1F01: return 'Mock WebGL Renderer'; // GL_RENDERER
                case 0x1F02: return 'WebGL 2.0'; // GL_VERSION
                case 0x8B8C: return 16; // GL_MAX_FRAGMENT_UNIFORM_VECTORS
                case 0x8B8B: return 16; // GL_MAX_VERTEX_UNIFORM_VECTORS
                case 0x8872: return 8; // GL_MAX_VARYING_VECTORS
                case 0x8B4D: return 16; // GL_MAX_VERTEX_ATTRIBS
                case 0x8DFB: return 16; // GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS
                case 0x8B4C: return 16; // GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS
                case 0x8B4F: return 16; // GL_MAX_TEXTURE_IMAGE_UNITS
                case 0x851C: return 4096; // GL_MAX_RENDERBUFFER_SIZE
                case 0x0D33: return 4096; // GL_MAX_TEXTURE_SIZE
                case 0x8073: return 4096; // GL_MAX_CUBE_MAP_TEXTURE_SIZE
                default: return 0;
            }
        },
        createShader: () => ({}),
        shaderSource: () => { },
        compileShader: () => { },
        getShaderParameter: () => true,
        createProgram: () => ({}),
        attachShader: () => { },
        linkProgram: () => { },
        getProgramParameter: () => true,
        useProgram: () => { },
        createBuffer: () => ({}),
        bindBuffer: () => { },
        bufferData: () => { },
        createTexture: () => ({}),
        bindTexture: () => { },
        texImage2D: () => { },
        texParameteri: () => { },
        createFramebuffer: () => ({}),
        bindFramebuffer: () => { },
        framebufferTexture2D: () => { },
        createRenderbuffer: () => ({}),
        bindRenderbuffer: () => { },
        renderbufferStorage: () => { },
        framebufferRenderbuffer: () => { },
        checkFramebufferStatus: () => 0x8CD5, // GL_FRAMEBUFFER_COMPLETE
        viewport: () => { },
        clear: () => { },
        clearColor: () => { },
        enable: () => { },
        disable: () => { },
        depthFunc: () => { },
        blendFunc: () => { },
        drawElements: () => { },
        drawArrays: () => { },
        getUniformLocation: () => ({}),
        getAttribLocation: () => 0,
        uniform1f: () => { },
        uniform1i: () => { },
        uniform2f: () => { },
        uniform3f: () => { },
        uniform4f: () => { },
        uniformMatrix3fv: () => { },
        uniformMatrix4fv: () => { },
        vertexAttribPointer: () => { },
        enableVertexAttribArray: () => { },
        disableVertexAttribArray: () => { },
        activeTexture: () => { },
        generateMipmap: () => { },
        pixelStorei: () => { },
        readPixels: () => { },
        deleteBuffer: () => { },
        deleteTexture: () => { },
        deleteFramebuffer: () => { },
        deleteRenderbuffer: () => { },
        deleteShader: () => { },
        deleteProgram: () => { },
        isContextLost: () => false,
        // WebGL 2.0 methods
        createVertexArray: () => ({}),
        bindVertexArray: () => { },
        deleteVertexArray: () => { }
    };

    // إضافة getContext للـ canvas
    HTMLCanvasElement.prototype.getContext = function (contextType: string) {
        if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
            return mockWebGLContext;
        }
        return null;
    };

    // إضافة toDataURL للـ canvas
    HTMLCanvasElement.prototype.toDataURL = function () {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    };
};

/**
 * إعداد File API وهمي
 */
const setupMockFileAPI = () => {
    global.File = class MockFile {
        name: string;
        size: number;
        type: string;
        lastModified: number;

        constructor(bits: any[], filename: string, options: any = {}) {
            this.name = filename;
            this.size = bits.reduce((acc, bit) => acc + (bit.length || bit.byteLength || 0), 0);
            this.type = options.type || '';
            this.lastModified = options.lastModified || Date.now();
        }

        arrayBuffer(): Promise<ArrayBuffer> {
            return Promise.resolve(new ArrayBuffer(this.size));
        }

        text(): Promise<string> {
            return Promise.resolve('mock file content');
        }

        stream(): ReadableStream {
            return new ReadableStream();
        }

        slice(): File {
            return new (File as any)([], this.name);
        }
    } as any;

    global.Blob = class MockBlob {
        size: number;
        type: string;

        constructor(bits: any[] = [], options: any = {}) {
            this.size = bits.reduce((acc, bit) => acc + (bit.length || bit.byteLength || 0), 0);
            this.type = options.type || '';
        }

        arrayBuffer(): Promise<ArrayBuffer> {
            return Promise.resolve(new ArrayBuffer(this.size));
        }

        text(): Promise<string> {
            return Promise.resolve('mock blob content');
        }

        stream(): ReadableStream {
            return new ReadableStream();
        }

        slice(): Blob {
            return new (Blob as any)();
        }
    } as any;

    global.FileReader = class MockFileReader {
        result: any = null;
        error: any = null;
        readyState: number = 0;
        onload: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onloadend: ((event: any) => void) | null = null;

        readAsArrayBuffer(file: File): void {
            setTimeout(() => {
                this.result = new ArrayBuffer(file.size);
                this.readyState = 2;
                if (this.onload) this.onload({ target: this });
                if (this.onloadend) this.onloadend({ target: this });
            }, 0);
        }

        readAsText(file: File): void {
            setTimeout(() => {
                this.result = 'mock file content';
                this.readyState = 2;
                if (this.onload) this.onload({ target: this });
                if (this.onloadend) this.onloadend({ target: this });
            }, 0);
        }

        readAsDataURL(file: File): void {
            setTimeout(() => {
                this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
                this.readyState = 2;
                if (this.onload) this.onload({ target: this });
                if (this.onloadend) this.onloadend({ target: this });
            }, 0);
        }
    } as any;
};

/**
 * إعداد Canvas API وهمي
 */
const setupMockCanvas = () => {
    global.Image = class MockImage {
        src: string = '';
        width: number = 0;
        height: number = 0;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
            // محاكاة تحميل الصورة
            setTimeout(() => {
                this.width = 256;
                this.height = 256;
                if (this.onload) this.onload();
            }, 0);
        }
    } as any;

    // إضافة createImageBitmap
    global.createImageBitmap = async (source: any) => {
        return {
            width: 256,
            height: 256,
            close: () => { }
        };
    };
};

/**
 * إعداد حالة اختبار جديدة
 */
const setupTestCase = () => {
    // إعادة تعيين Three.js cache
    THREE.Cache.clear();

    // إعادة تعيين console warnings
    console.warn = vi.fn();
    console.error = vi.fn();
};

/**
 * تنظيف حالة الاختبار
 */
const cleanupTestCase = () => {
    // تنظيف Three.js resources
    THREE.Cache.clear();

    // إعادة تعيين mocks
    vi.clearAllMocks();
};

/**
 * تنظيف البيئة
 */
const cleanupTestEnvironment = () => {
    // تنظيف المتغيرات العامة
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).navigator;
    delete (global as any).HTMLElement;
    delete (global as any).HTMLCanvasElement;
    delete (global as any).ImageData;
    delete (global as any).File;
    delete (global as any).Blob;
    delete (global as any).FileReader;
    delete (global as any).Image;
    delete (global as any).createImageBitmap;
};

/**
 * مساعدات الاختبار
 */
export const testHelpers = {
    /**
     * إنشاء ArrayBuffer وهمي بحجم محدد
     */
    createMockArrayBuffer: (size: number): ArrayBuffer => {
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);

        // ملء البيانات بقيم عشوائية
        for (let i = 0; i < size; i++) {
            view[i] = Math.floor(Math.random() * 256);
        }

        return buffer;
    },

    /**
     * إنشاء Blob وهمي بمحتوى محدد
     */
    createMockBlob: (content: string, type: string = 'text/plain'): Blob => {
        return new Blob([content], { type });
    },

    /**
     * إنشاء File وهمي
     */
    createMockFile: (content: string, filename: string, type: string = 'text/plain'): File => {
        return new File([content], filename, { type });
    },

    /**
     * التحقق من صحة GLB header
     */
    validateGLBHeader: (buffer: ArrayBuffer): boolean => {
        if (buffer.byteLength < 12) return false;

        const view = new DataView(buffer);
        const magic = view.getUint32(0, true);
        const version = view.getUint32(4, true);
        const length = view.getUint32(8, true);

        return magic === 0x46546C67 && version === 2 && length <= buffer.byteLength;
    },

    /**
     * التحقق من صحة OBJ content
     */
    validateOBJContent: (content: string): boolean => {
        const lines = content.split('\n');
        let hasVertices = false;
        let hasFaces = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('v ')) hasVertices = true;
            if (trimmed.startsWith('f ')) hasFaces = true;
        }

        return hasVertices && hasFaces;
    },

    /**
     * قياس أداء العملية
     */
    measurePerformance: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
        const start = performance.now();
        const result = await operation();
        const end = performance.now();

        return {
            result,
            duration: end - start
        };
    },

    /**
     * انتظار لفترة محددة
     */
    wait: (ms: number): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

/**
 * إعدادات اختبار مخصصة للتصدير
 */
export const exportTestConfig = {
    // حد أقصى لوقت تنفيذ الاختبار (30 ثانية)
    timeout: 30000,

    // عدد التكرارات للاختبارات السريعة
    fastTestRuns: 100,

    // عدد التكرارات للاختبارات البطيئة
    slowTestRuns: 50,

    // حد أقصى لحجم الملف المصدر (10MB)
    maxExportSize: 10 * 1024 * 1024,

    // حد أدنى لجودة الضغط
    minCompressionQuality: 0.1,

    // حد أقصى لعدد المضلعات في الاختبار
    maxPolygonCount: 100000
};