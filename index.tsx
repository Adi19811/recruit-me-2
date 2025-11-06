import React, { useState, useCallback, FC } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Experience {
  id: number;
  position: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface CVData {
  fullName: string;
  profileImage: string | null;
  birthDate: string;
  experience: Experience[];
}

const initialCVData: CVData = {
  fullName: 'Jan Kowalski',
  profileImage: null,
  birthDate: '16/10/1985',
  experience: [
    {
      id: 1,
      position: 'Pracownik magazynu',
      company: 'Amazon',
      startDate: '2020-01',
      endDate: '2022-12',
      description: 'Kompletowanie zamówień, obsługa skanera, dbanie o porządek.',
    },
  ],
};

const translations = {
  pl: {
    downloadPdf: 'Pobierz PDF',
    generatingPdf: 'Generowanie PDF...',
    sendEmail: 'Wyślij E-mailem',
    sendWhatsApp: 'Wyślij przez WhatsApp',
    generateRecommendationFirst: 'Najpierw wygeneruj rekomendację, aby ją wysłać.',
    loadAndParse: 'Wczytaj i sparsuj CV',
    pasteOrDrop: 'Wklej tutaj treść CV kandydata lub upuść plik...',
    selectFile: 'lub wybierz plik CV',
    processing: 'Przetwarzanie...',
    processCV: 'Przetwórz CV',
    mainActions: 'Akcje Główne',
    translating: 'Tłumaczenie...',
    translateTo: (lang: string) => `Tłumacz na ${lang.toUpperCase()}`,
    basicInfo: 'Podstawowe informacje',
    fullName: 'Imię i nazwisko',
    profilePicture: 'Zdjęcie profilowe',
    chooseFile: 'Wybierz plik',
    fileSelected: 'Plik wybrany',
    noFileChosen: 'Nie wybrano pliku',
    birthDate: 'Data urodzenia',
    workExperience: 'Doświadczenie zawodowe',
    position: 'Stanowisko',
    company: 'Firma',
    startDate: 'Data rozpoczęcia (np. 2020-01)',
    endDate: 'Data zakończenia (np. 2022-12)',
    description: 'Opis obowiązków',
    removeExperience: 'Usuń doświadczenie',
    addExperience: '+ Dodaj doświadczenie',
    recommendationGenerator: 'Generator Rekomendacji',
    pasteNotes: 'Wklej tutaj notatki o kandydacie (np. z ATS)...',
    generating: 'Generowanie...',
    generateRecommendation: 'Generuj Rekomendację',
    generatedRecommendation: 'Wygenerowana rekomendacja:',
    copy: 'Kopiuj',
    previewFullName: 'Imię i Nazwisko',
    cvBirthDate: 'Data urodzenia:',
  },
  en: {
    downloadPdf: 'Download PDF',
    generatingPdf: 'Generating PDF...',
    sendEmail: 'Send via Email',
    sendWhatsApp: 'Send via WhatsApp',
    generateRecommendationFirst: 'First, generate a recommendation to send it.',
    loadAndParse: 'Load and Parse CV',
    pasteOrDrop: "Paste candidate's CV content here or drop a file...",
    selectFile: 'or select a CV file',
    processing: 'Processing...',
    processCV: 'Process CV',
    mainActions: 'Main Actions',
    translating: 'Translating...',
    translateTo: (lang: string) => `Translate to ${lang.toUpperCase()}`,
    basicInfo: 'Basic Information',
    fullName: 'Full Name',
    profilePicture: 'Profile Picture',
    chooseFile: 'Choose file',
    fileSelected: 'File selected',
    noFileChosen: 'No file chosen',
    birthDate: 'Date of Birth',
    workExperience: 'Work Experience',
    position: 'Position',
    company: 'Company',
    startDate: 'Start Date (e.g., 2020-01)',
    endDate: 'End Date (e.g., 2022-12)',
    description: 'Description of duties',
    removeExperience: 'Remove experience',
    addExperience: '+ Add experience',
    recommendationGenerator: 'Recommendation Generator',
    pasteNotes: 'Paste notes about the candidate here (e.g., from ATS)...',
    generating: 'Generating...',
    generateRecommendation: 'Generate Recommendation',
    generatedRecommendation: 'Generated recommendation:',
    copy: 'Copy',
    previewFullName: 'Full Name',
    cvBirthDate: 'Date of Birth:',
  },
};

const Card: FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`card ${className || ''}`}>
    <div className="card-header">{title}</div>
    <div className="card-body">{children}</div>
  </div>
);

const InputField: FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; }> = ({ label, value, onChange, name }) => (
  <div className="form-group">
    <label htmlFor={name}>{label}</label>
    <input type="text" id={name} name={name} value={value} onChange={onChange} />
  </div>
);

const ExperienceForm: React.FC<{
  exp: Experience;
  onUpdate: (id: number, field: keyof Experience, value: string) => void;
  onRemove: (id: number) => void;
  t: typeof translations.pl;
}> = ({ exp, onUpdate, onRemove, t }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onUpdate(exp.id, name as keyof Experience, value);
  };

  return (
    <div className="experience-item">
      <input type="text" name="position" value={exp.position} onChange={handleChange} placeholder={t.position} />
      <input type="text" name="company" value={exp.company} onChange={handleChange} placeholder={t.company} />
      <div className="date-inputs">
        <input type="text" name="startDate" value={exp.startDate} onChange={handleChange} placeholder={t.startDate} />
        <input type="text" name="endDate" value={exp.endDate} onChange={handleChange} placeholder={t.endDate} />
      </div>
      <textarea name="description" value={exp.description} onChange={handleChange} placeholder={t.description} rows={3}></textarea>
      <button onClick={() => onRemove(exp.id)} className="remove-experience-btn">
        {t.removeExperience}
      </button>
    </div>
  );
};


const App = () => {
  const [cvData, setCvData] = useState<CVData>(initialCVData);
  const [cvTextToParse, setCvTextToParse] = useState('');
  const [cvFileToParse, setCvFileToParse] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [recruiterNote, setRecruiterNote] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [language, setLanguage] = useState<'pl' | 'en'>('pl');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const t = translations[language];

  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCvData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCvData((prev) => ({ ...prev, profileImage: event.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleExperienceUpdate = (id: number, field: keyof Experience, value: string) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    }));
  };

  const addExperience = () => {
    setCvData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: Date.now(),
          position: '',
          company: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }));
  };

  const removeExperience = (id: number) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleParseCV = async () => {
    if (!cvTextToParse && !cvFileToParse) return;
    setIsParsing(true);
    setParseError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const prompt = `Przeanalizuj poniższe CV i wyodrębnij następujące informacje w formacie JSON: imię i nazwisko (fullName), data urodzenia (birthDate w formacie DD/MM/YYYY), oraz historia zatrudnienia (experience) jako tablica obiektów, gdzie każdy obiekt zawiera stanowisko (position), firmę (company), datę rozpoczęcia (startDate w formacie YYYY-MM), datę zakończenia (endDate w formacie YYYY-MM) i krótki opis (description). Jeśli brakuje jakiejś informacji, zostaw puste pole.`;

      let contents;
      if (cvFileToParse) {
        const base64Data = await blobToBase64(cvFileToParse);
        contents = {
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: cvFileToParse.type,
                        data: base64Data
                    }
                }
            ]
        };
      } else {
        contents = `${prompt}\n\nCV:\n${cvTextToParse}`;
      }
      
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              birthDate: { type: Type.STRING },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    position: { type: Type.STRING },
                    company: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsedData = JSON.parse(response.text.trim());
      
      setCvData(prev => ({
        ...prev,
        fullName: parsedData.fullName || prev.fullName,
        birthDate: parsedData.birthDate || prev.birthDate,
        experience: parsedData.experience?.map((exp: any, index: number) => ({ ...exp, id: Date.now() + index })) || prev.experience
      }));

    } catch (e) {
      console.error(e);
      setParseError(e instanceof Error ? e.message : 'Wystąpił nieznany błąd podczas parsowania CV.');
    } finally {
      setIsParsing(false);
      setCvTextToParse('');
      setCvFileToParse(null);
    }
  };

  const handleGenerateRecommendation = async () => {
        if (!recruiterNote.trim() || !cvData.fullName) return;

        setIsGeneratingRecommendation(true);
        setRecommendationError('');
        setRecommendation('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-2.5-flash';

            const cvDetails = `
                Full Name: ${cvData.fullName}
                Birth Date: ${cvData.birthDate}
                Experience:
                ${cvData.experience.map(exp => 
                `- ${exp.position} at ${exp.company} (${exp.startDate} to ${exp.endDate}): ${exp.description}`
                ).join('\n')}
            `;

            const prompt = `
                Jesteś doświadczonym rekruterem specjalizującym się w rekrutacji pracowników do produkcji i logistyki w Holandii. 
                Na podstawie poniższych Danych z CV i Krótkiej Notatki o kandydacie napisz krótką rekomendację w języku angielskim (3–5 zdań), w której pokażesz, dlaczego kandydat nadaje się do wyjazdu do pracy.

                Uwzględnij:
                – najważniejsze doświadczenie (z nazwą firmy i czasem pracy, jeśli podano),
                – praktyczne umiejętności przydatne w logistyce/produkcji,
                – poziom języka angielskiego,
                – czy ma prawo jazdy,
                – czy chce wyjechać sam czy z kimś i na jak długo,
                – preferencje dotyczące pracy, jeśli są.

                Styl powinien być profesjonalny, ale swobodny – jakbyś polecał kandydata koleżance/koledze z działu rekrutacji. Bez zbędnych formalności, rzeczowo i na temat.

                --- DANE Z CV ---
                ${cvDetails}

                --- KRÓTKA NOTATKA O KANDDACIE ---
                ${recruiterNote}
            `;
            
            const result = await ai.models.generateContent({ model, contents: prompt });
            setRecommendation(result.text);

        } catch(e) {
            console.error(e);
            setRecommendationError(e instanceof Error ? e.message : 'Wystąpił nieznany błąd podczas generowania rekomendacji.');
        } finally {
            setIsGeneratingRecommendation(false);
        }
    };
    
    const handleTranslate = async () => {
        setIsTranslating(true);
        setTranslationError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = 'gemini-2.5-flash';
            const targetLanguage = language === 'pl' ? 'English' : 'Polish';
            const sourceLanguage = language === 'pl' ? 'Polish' : 'English';

            const dataToTranslate = {
                fullName: cvData.fullName,
                experience: cvData.experience.map(({ position, company, description }) => ({
                    position,
                    company,
                    description,
                })),
            };

            const prompt = `Translate the text values in the following JSON object from ${sourceLanguage} to ${targetLanguage}. Maintain the exact JSON structure in your response. Only translate the string values for "fullName", "position", "company", and "description".

            JSON data:
            ${JSON.stringify(dataToTranslate, null, 2)}
            `;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            fullName: { type: Type.STRING },
                            experience: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        position: { type: Type.STRING },
                                        company: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                    },
                                    required: ['position', 'company', 'description'],
                                },
                            },
                        },
                        required: ['fullName', 'experience'],
                    },
                },
            });

            const translatedData = JSON.parse(response.text.trim());
            
            setCvData(prev => ({
                ...prev,
                fullName: translatedData.fullName,
                experience: prev.experience.map((exp, index) => ({
                    ...exp,
                    position: translatedData.experience[index]?.position || exp.position,
                    company: translatedData.experience[index]?.company || exp.company,
                    description: translatedData.experience[index]?.description || exp.description,
                })),
            }));

            setLanguage(prev => (prev === 'pl' ? 'en' : 'pl'));

        } catch (e) {
            console.error(e);
            setTranslationError(e instanceof Error ? e.message : 'Wystąpił błąd podczas tłumaczenia.');
        } finally {
            setIsTranslating(false);
        }
    };

  const handleDownloadPdf = async () => {
    const cvElement = document.querySelector('.cv-preview');
    if (!cvElement) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(cvElement as HTMLElement, {
        scale: 2, // Higher scale for better quality
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CV_${cvData.fullName.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCvTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCvTextToParse(e.target.value);
    if (e.target.value && cvFileToParse) {
        setCvFileToParse(null);
    }
  }

  const handleCvFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCvFileToParse(file);
    if(file && cvTextToParse) {
        setCvTextToParse('');
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setCvFileToParse(file);
      if (cvTextToParse) {
        setCvTextToParse('');
      }
      // Also clear the file input visually if needed
      const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const mailtoLink = recommendation 
    ? `mailto:?subject=${encodeURIComponent(`Recommendation for ${cvData.fullName}`)}&body=${encodeURIComponent(`${recommendation}\n\n`)}`
    : '#';
  
  const whatsappLink = recommendation
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(recommendation)}`
    : '#';

  const handleShareClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!recommendation) {
      e.preventDefault();
      alert(t.generateRecommendationFirst);
    }
  };


  return (
    <>
      <header className="app-header">
        <div className="logo">RecruitMe</div>
        <div className="actions">
            <button className="action-btn pdf" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? t.generatingPdf : t.downloadPdf}
            </button>
            <a 
              href={mailtoLink}
              className="action-btn email" 
              onClick={handleShareClick}
            >
              {t.sendEmail}
            </a>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn whatsapp" 
              onClick={handleShareClick}
            >
              {t.sendWhatsApp}
            </a>
        </div>
      </header>
      <div className="main-container">
        <div className="form-panel">
           <Card title={t.loadAndParse}>
                <div 
                  className={`drop-zone-wrapper ${isDragging ? 'dragging' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <textarea
                      value={cvTextToParse}
                      onChange={handleCvTextInput}
                      placeholder={t.pasteOrDrop}
                      rows={8}
                      className="cv-parse-textarea"
                      disabled={isParsing}
                  />
                  <div className="file-input-wrapper">
                      <label htmlFor="cv-file-input" className="file-input-label">
                          {t.selectFile}
                      </label>
                      <input id="cv-file-input" type="file" onChange={handleCvFileInput} accept="image/*,.pdf,.doc,.docx" disabled={isParsing} />
                      {cvFileToParse && <span className="file-name">{cvFileToParse.name}</span>}
                  </div>
                  <button onClick={handleParseCV} disabled={isParsing || (!cvTextToParse && !cvFileToParse)}>
                      {isParsing ? t.processing : t.processCV}
                  </button>
                  {parseError && <p className="error-message">{parseError}</p>}
                </div>
            </Card>
            
          <Card title={t.mainActions}>
              <button onClick={handleTranslate} disabled={isTranslating}>
                  {isTranslating ? t.translating : t.translateTo(language === 'pl' ? 'en' : 'pl')}
              </button>
              {translationError && <p className="error-message">{translationError}</p>}
          </Card>

          <Card title={t.basicInfo}>
            <InputField label={t.fullName} name="fullName" value={cvData.fullName} onChange={handleBasicInfoChange} />
            <div className="form-group">
              <label>{t.profilePicture}</label>
              <div className="file-upload-container">
                <input type="file" id="profileImage" name="profileImage" onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                <label htmlFor="profileImage" className="file-upload-btn">{t.chooseFile}</label>
                <span>{cvData.profileImage ? t.fileSelected : t.noFileChosen}</span>
              </div>
            </div>
            <InputField label={t.birthDate} name="birthDate" value={cvData.birthDate} onChange={handleBasicInfoChange} />
          </Card>
          <Card title={t.workExperience}>
            {cvData.experience.map((exp) => (
              <ExperienceForm key={exp.id} exp={exp} onUpdate={handleExperienceUpdate} onRemove={removeExperience} t={t} />
            ))}
            <button onClick={addExperience} className="add-experience-btn">
              {t.addExperience}
            </button>
          </Card>
        </div>
        <div className="preview-panel">
            <Card title={t.recommendationGenerator}>
              <textarea
                  value={recruiterNote}
                  onChange={(e) => setRecruiterNote(e.target.value)}
                  placeholder={t.pasteNotes}
                  rows={6}
                  className="rec-note-textarea"
                  disabled={isGeneratingRecommendation}
              />
              <button onClick={handleGenerateRecommendation} disabled={isGeneratingRecommendation || !recruiterNote.trim() || !cvData.fullName}>
                  {isGeneratingRecommendation ? t.generating : t.generateRecommendation}
              </button>
              {recommendationError && <p className="error-message">{recommendationError}</p>}
              {recommendation && (
                  <div className="recommendation-output">
                      <h4>{t.generatedRecommendation}</h4>
                      <pre>{recommendation}</pre>
                      <button onClick={() => navigator.clipboard.writeText(recommendation)}>
                          {t.copy}
                      </button>
                  </div>
              )}
            </Card>
            <div className="cv-preview">
                <div className="cv-header">
                {cvData.profileImage && <img src={cvData.profileImage} alt="Profile" className="cv-profile-img" />}
                <h1>{cvData.fullName || t.previewFullName}</h1>
                </div>
                <div className="cv-body">
                    <div className="cv-section">
                        <h2>{t.basicInfo}</h2>
                        <p><strong>{t.cvBirthDate}</strong> {cvData.birthDate}</p>
                    </div>
                    {cvData.experience.length > 0 && (
                        <div className="cv-section">
                            <h2>{t.workExperience}</h2>
                            {cvData.experience.map(exp => (
                                <div key={exp.id} className="cv-experience-item">
                                    <h3>{exp.position}</h3>
                                    <h4>{exp.company}</h4>
                                    <p className="cv-dates">{exp.startDate} - {exp.endDate}</p>
                                    <p>{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      <style>{`
        :root {
          --primary-color: #DC3545;
          --secondary-color: #6C757D;
          --background-color: #F8F9FA;
          --card-bg-color: #FFFFFF;
          --text-color: #343A40;
          --border-color: #E9ECEF;
          --font-family: 'Poppins', sans-serif;
          --box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        body {
          margin: 0;
          font-family: var(--font-family);
          background-color: var(--background-color);
          color: var(--text-color);
        }
        
        .app-header {
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .actions {
            display: flex;
            gap: 1rem;
        }
        
        .action-btn {
            padding: 0.6rem 1.2rem;
            border-radius: 5px;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s;
            color: white;
            display: inline-block;
            text-decoration: none;
        }

        .action-btn.pdf { background-color: #C82333; }
        .action-btn.email { background-color: #007BFF; }
        .action-btn.whatsapp { background-color: #28A745; }

        .action-btn:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        
        .action-btn:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
            opacity: 0.7;
        }

        .main-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 2rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        @media (max-width: 1200px) {
          .main-container {
            grid-template-columns: 1fr;
          }
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card {
          background-color: var(--card-bg-color);
          border-radius: 8px;
          box-shadow: var(--box-shadow);
          overflow: hidden;
        }
        
        .card-header {
          padding: 1rem 1.5rem;
          font-weight: 600;
          font-size: 1.1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .card-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        
        .drop-zone-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin: -1.5rem;
          padding: 1.5rem;
          border-radius: 8px;
          border: 2px dashed transparent;
          transition: all 0.2s ease-in-out;
        }
        
        .drop-zone-wrapper.dragging {
          border-color: var(--primary-color);
          background-color: #fef5f5;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        input[type="text"], textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: var(--font-family);
          font-size: 1rem;
          box-sizing: border-box;
        }
        
        textarea {
          resize: vertical;
        }

        .file-upload-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid var(--border-color);
          padding: 0.5rem;
          border-radius: 4px;
        }
        
        .file-upload-btn, .file-input-label {
          background-color: #fce8e6;
          color: var(--primary-color);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .file-upload-container span, .file-name {
          color: var(--secondary-color);
          font-size: 0.9rem;
        }
        
        .file-input-wrapper {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        #cv-file-input {
            display: none;
        }

        .add-experience-btn, .remove-experience-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
          padding: 0.5rem 0;
        }
        
        .remove-experience-btn {
            font-size: 0.8rem;
            color: var(--secondary-color);
        }

        .experience-item {
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        
        .date-inputs {
            display: flex;
            gap: 1rem;
        }

        /* Preview Panel */
        .preview-panel {
            position: sticky;
            top: 2rem;
            align-self: flex-start;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .cv-preview {
          background-color: var(--card-bg-color);
          box-shadow: var(--box-shadow);
          border-radius: 8px;
        }
        
        .cv-header {
          background-color: var(--primary-color);
          color: white;
          padding: 2.5rem 2rem;
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .cv-profile-img {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          object-fit: cover;
        }
        
        .cv-header h1 {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .cv-body {
            padding: 2rem;
        }
        
        .cv-section {
            margin-bottom: 2rem;
        }

        .cv-section h2 {
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .cv-experience-item {
            margin-bottom: 1.5rem;
        }
        
        .cv-experience-item h3 {
            margin: 0 0 0.2rem 0;
        }
        
        .cv-experience-item h4 {
            margin: 0 0 0.5rem 0;
            color: var(--secondary-color);
            font-weight: 500;
        }

        .cv-dates {
            font-size: 0.9rem;
            color: var(--secondary-color);
            font-style: italic;
        }
        
        button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        button:hover:not(:disabled) {
            background-color: #c82333;
        }
        
        button:disabled {
            background-color: #e9ecef;
            cursor: not-allowed;
            color: #6c757d;
        }
        
        .error-message {
            color: var(--primary-color);
            font-size: 0.9rem;
        }

        .recommendation-output {
            margin-top: 1rem;
            border-top: 1px solid var(--border-color);
            padding-top: 1rem;
        }

        .recommendation-output h4 {
            margin-bottom: 0.5rem;
        }

        .recommendation-output pre {
            background-color: var(--background-color);
            padding: 1rem;
            border-radius: 4px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--font-family);
        }

        .recommendation-output button {
            margin-top: 0.5rem;
            background-color: var(--secondary-color);
        }

        .recommendation-output button:hover {
            background-color: #5a6268;
        }

      `}</style>
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}