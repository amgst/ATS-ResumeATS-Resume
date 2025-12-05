import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Get API key from environment (supports both Vite's import.meta.env and process.env)
const API_KEY = (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY || 
                 (typeof process !== 'undefined' && (process.env?.API_KEY || process.env?.GEMINI_API_KEY)) || '') as string;

// Initialize Gemini API (will throw error if API key is missing, handled in component)
let ai: GoogleGenAI | null = null;
if (API_KEY && API_KEY !== 'your_api_key_here' && API_KEY !== '') {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [atsContent, setAtsContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please select a valid PDF file.");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please select a valid PDF file.");
      }
    }
  };

  const processResume = async () => {
    if (!file) return;

    // Check if API key is configured
    if (!ai || !API_KEY || API_KEY === 'your_api_key_here' || API_KEY === '') {
      setError("API Key not configured. Please create a .env file in the project root with: GEMINI_API_KEY=your_actual_api_key");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setAtsContent(null);

    try {
      const base64Data = await fileToBase64(file);

      // System instruction for the model
      const systemInstruction = `
        You are an expert Resume Writer and Applicant Tracking System (ATS) Specialist.
        Your task is to take a raw resume PDF and convert it into a strictly formatted, text-based ATS-friendly HTML structure.
        
        Rules:
        1. Remove all columns, sidebars, graphics, photos, and complex layouts.
        2. Content must be linear (top to bottom).
        3. Use standard section headers EXACTLY as follows: SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS, CERTIFICATIONS (if applicable).
        4. Use semantic HTML tags: <h2> for section headers, <h3> for job titles/universities, <p> for body text, <ul> and <li> for bullet points.
        5. Do NOT include <html>, <head>, or <body> tags. Just return the content div.
        6. Clean up OCR errors or weird spacing.
        7. Ensure contact info is at the top (Name, Email, Phone, LinkedIn).
        8. For the Skills section, comma separate them if they are short, or use a list if detailed.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2, // Low temperature for consistent formatting
        },
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
              },
            },
            {
              text: "Convert this resume into an ATS-optimized HTML format.",
            },
          ],
        },
      });

      const extractedHtml = response.text;
      
      // Basic cleanup to ensure we just have the div content if the model wraps it in markdown blocks
      const cleanHtml = extractedHtml?.replace(/```html|```/g, "").trim();

      setAtsContent(cleanHtml || "<p>Could not generate content.</p>");
    } catch (err: any) {
      console.error(err);
      setError("Failed to process the resume. " + (err.message || "Please try again."));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!atsContent) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get the resume preview container
      const element = document.getElementById("resume-preview-container");
      if (!element) {
        throw new Error("Resume preview container not found");
      }

      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Standard letter size (8.5 x 11 inches)
      const pdfWidth = 8.5;
      const pdfHeight = 11;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      // Calculate image dimensions to fit page width
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdfHeight;
      
      // If content fits on one page
      if (imgHeight <= pageHeight) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page handling
        let heightLeft = imgHeight;
        let position = 0;
        const imgData = canvas.toDataURL("image/png");
        
        // Add first page
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      // Download the PDF
      pdf.save("ATS-Resume.pdf");
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate PDF. " + (err.message || "Please try again."));
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (atsContent) {
      navigator.clipboard.writeText(atsContent).then(() => {
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      });
    }
  };

  const reset = () => {
    setFile(null);
    setAtsContent(null);
    setError(null);
  };

  const isApiKeyMissing = !ai || !API_KEY || API_KEY === 'your_api_key_here' || API_KEY === '';

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 print:p-0 print:block">
      {/* API Key Warning */}
      {isApiKeyMissing && (
        <div className="w-full max-w-4xl mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg no-print">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation text-yellow-600 text-xl mt-0.5"></i>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-1">API Key Not Configured</h3>
              <p className="text-sm text-yellow-700">
                Please create a <code className="bg-yellow-100 px-1 rounded">.env</code> file in the project root with: 
                <code className="bg-yellow-100 px-1 rounded block mt-1">GEMINI_API_KEY=your_actual_api_key</code>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="mb-10 text-center no-print">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4 shadow-lg">
          <i className="fa-solid fa-file-shield text-3xl"></i>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          ATS Resume Converter
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Transform your creative PDF resume into a clean, machine-readable format optimized for Applicant Tracking Systems.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl print:max-w-none print:w-full">
        
        {/* Step 1: Upload */}
        {!atsContent && (
          <div className={`transition-all duration-300 no-print ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div
              className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
              
              {!file ? (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-300 mb-4"></i>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">
                    Drop your Resume PDF here
                  </h3>
                  <p className="text-sm text-gray-400">or click to browse files</p>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <i className="fa-solid fa-file-pdf text-5xl text-red-500 mb-4"></i>
                  <p className="text-lg font-medium text-gray-800 mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      processResume();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    Convert to ATS Format
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="mt-4 text-sm text-gray-400 hover:text-red-500 underline"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center no-print">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 animate-pulse">Analyzing Resume...</h2>
            <p className="text-gray-500 mt-2">Extracting text and restructuring for ATS compliance</p>
          </div>
        )}

        {/* Step 2: Result & Preview */}
        {atsContent && (
          <div className="animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 no-print">
              <button
                onClick={reset}
                className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left"></i> Convert Another
              </button>
              
              <div className="flex flex-wrap gap-3 justify-center">
                 <button
                  onClick={copyToClipboard}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                   {showCopySuccess ? <i className="fa-solid fa-check text-green-600"></i> : <i className="fa-solid fa-code"></i>}
                   {showCopySuccess ? "Copied!" : "Copy HTML"}
                </button>
                
                <button
                  onClick={handleDownloadPDF}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-download"></i> Save as PDF
                </button>
              </div>
            </div>

            {/* Paper Preview */}
            <div 
              id="resume-preview-container"
              className="bg-white text-black p-[0.5in] sm:p-[0.75in] shadow-2xl mx-auto min-h-[11in] w-full max-w-[8.5in] border border-gray-200"
            >
              {/* We render the HTML directly. */}
              <div 
                className="ats-content text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: atsContent }} 
              />
            </div>
            
            <p className="text-center text-gray-400 text-sm mt-8 mb-12 no-print">
              Tip: The standard ATS format is intentionally simple to ensure maximum readability by robotic systems.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);