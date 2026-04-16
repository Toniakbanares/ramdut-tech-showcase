import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Bot, User, Loader2, Sparkles, MessageSquare, 
  ArrowLeft, Trash2, ImagePlus, Eye, Wand2, ThermometerSun, Volume2,
  Laugh, Download, RefreshCw, Settings2, Zap, Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import mascotImg from '@/assets/mascot-ramu.png';

declare global {
  interface Window {
    puter: any;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const IMAGE_MODELS = [
  { id: 'google/gemini-2.5-flash-image', name: 'Nano Banana', desc: 'Rápido', icon: Zap },
  { id: 'google/gemini-3.1-flash-image-preview', name: 'Nano Banana 2', desc: 'Rápido + Alta qualidade', icon: Crown },
  { id: 'google/gemini-3-pro-image-preview', name: 'Pro Image', desc: 'Melhor qualidade', icon: Crown },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '⬜ 1:1', desc: 'Quadrado' },
  { id: '16:9', label: '🖥️ 16:9', desc: 'Paisagem' },
  { id: '9:16', label: '📱 9:16', desc: 'Retrato' },
  { id: '4:3', label: '📺 4:3', desc: 'Clássico' },
  { id: '3:2', label: '📷 3:2', desc: 'Foto' },
  { id: '21:9', label: '🎬 21:9', desc: 'Ultrawide' },
];

const IMAGE_STYLES = [
  { id: 'realistic', label: '📷 Realista', prompt: 'photorealistic, ultra detailed, 8k, professional photography' },
  { id: 'artistic', label: '🎨 Artístico', prompt: 'artistic, oil painting style, vibrant colors, masterpiece' },
  { id: 'anime', label: '🌸 Anime', prompt: 'anime style, high quality anime illustration, detailed' },
  { id: 'digital', label: '💻 Digital Art', prompt: 'digital art, concept art, trending on artstation, high detail' },
  { id: '3d', label: '🎮 3D Render', prompt: '3D render, octane render, ultra realistic, cinema 4d, blender' },
  { id: 'watercolor', label: '🖌️ Aquarela', prompt: 'watercolor painting, soft colors, artistic, beautiful' },
];

const MEME_TEMPLATES = [
  { id: 'drake', label: '🤔 Drake Meme', prompt: 'Drake meme format, two panels, top panel disapproving, bottom panel approving, comic style' },
  { id: 'distracted', label: '👀 Namorado Distraído', prompt: 'distracted boyfriend meme format, cartoon style, funny, three people' },
  { id: 'brain', label: '🧠 Expanding Brain', prompt: 'expanding brain meme, multiple panels showing increasing brain size, funny, satirical' },
  { id: 'custom', label: '✏️ Meme Personalizado', prompt: 'funny meme, internet humor, viral meme style' },
];

const CREATIVE_STYLES = [
  { id: 'poem', label: '📝 Poema', system: 'Você é um poeta talentoso. Escreva poemas criativos e expressivos.' },
  { id: 'story', label: '📖 Conto', system: 'Você é um escritor de contos. Crie histórias envolventes com começo, meio e fim.' },
  { id: 'song', label: '🎵 Letra de Música', system: 'Você é um letrista profissional. Escreva letras de música com refrão e versos.' },
  { id: 'script', label: '🎬 Roteiro', system: 'Você é um roteirista. Escreva diálogos e cenas cinematográficas.' },
  { id: 'humor', label: '😂 Comédia', system: 'Você é um humorista. Escreva textos engraçados, piadas e situações cômicas.' },
  { id: 'code', label: '💻 Código', system: 'Você é um programador expert. Explique e escreva código de forma clara.' },
];

const AITools = () => {
  const { toast } = useToast();

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('x-ai/grok-4-1-fast');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [generatedImageSrc, setGeneratedImageSrc] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState(IMAGE_MODELS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(IMAGE_STYLES[0].id);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(ASPECT_RATIOS[0].id);

  // Meme state
  const [memeTopText, setMemeTopText] = useState('');
  const [memeBottomText, setMemeBottomText] = useState('');
  const [memePrompt, setMemePrompt] = useState('');
  const [isMemeLoading, setIsMemeLoading] = useState(false);
  const [generatedMemeSrc, setGeneratedMemeSrc] = useState('');
  const [selectedMemeTemplate, setSelectedMemeTemplate] = useState(MEME_TEMPLATES[0].id);

  // Image analysis state
  const [imageUrl, setImageUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<'describe' | 'objects' | 'text' | 'mood'>('describe');

  // Creative writing state
  const [creativePrompt, setCreativePrompt] = useState('');
  const [creativeResult, setCreativeResult] = useState('');
  const [isCreativeLoading, setIsCreativeLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [creativeStyle, setCreativeStyle] = useState(CREATIVE_STYLES[0].id);

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const models = [
    { id: 'x-ai/grok-4-1-fast', name: 'Grok 4.1 Fast', desc: 'Rápido e eficiente' },
    { id: 'x-ai/grok-4.20', name: 'Grok 4.20', desc: 'Mais recente' },
    { id: 'x-ai/grok-3-fast', name: 'Grok 3 Fast', desc: 'Estável e rápido' },
    { id: 'x-ai/grok-3', name: 'Grok 3', desc: 'Alta qualidade' },
  ];

  // --- CHAT ---
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await window.puter.ai.chat(
        updatedMessages.map(m => ({ role: m.role, content: m.content })),
        { model: selectedModel }
      );
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.message.content }
      ]);
    } catch (error: any) {
      toast({ title: 'Erro no Chat', description: error.message || 'Falha ao obter resposta.', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- IMAGE GENERATION (Google Gemini API) ---
  const generateWithGemini = async (prompt: string, model: string): Promise<string | null> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Erro ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (imagePart) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    return null;
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setGeneratedImageSrc('');

    try {
      const style = IMAGE_STYLES.find(s => s.id === selectedStyle);
      const fullPrompt = `Generate a high-quality image: ${imagePrompt}. Style: ${style?.prompt || ''}`;
      const src = await generateWithGemini(fullPrompt, selectedImageModel);
      if (src) {
        setGeneratedImageSrc(src);
      } else {
        toast({ title: 'Aviso', description: 'Nenhuma imagem retornada. Tente outro prompt ou modelo.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro na Geração', description: error.message || 'Falha ao gerar imagem.', variant: 'destructive' });
    } finally {
      setIsImageLoading(false);
    }
  };

  // --- MEME GENERATION ---
  const handleGenerateMeme = async () => {
    if ((!memePrompt.trim() && !memeTopText.trim()) || isMemeLoading) return;
    setIsMemeLoading(true);
    setGeneratedMemeSrc('');

    try {
      const template = MEME_TEMPLATES.find(t => t.id === selectedMemeTemplate);
      const textInstructions = memeTopText || memeBottomText
        ? `Include the text "${memeTopText}" at the top and "${memeBottomText}" at the bottom of the image in bold white Impact font with black outline.`
        : '';
      const fullPrompt = `Generate a funny meme image: ${memePrompt || 'a hilarious meme'}. ${template?.prompt || ''}. ${textInstructions} Make it funny and viral-worthy, internet humor style.`;
      
      const src = await generateWithGemini(fullPrompt, selectedImageModel);
      if (src) {
        setGeneratedMemeSrc(src);
      } else {
        toast({ title: 'Aviso', description: 'Nenhum meme gerado. Tente outro prompt.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro no Meme', description: error.message || 'Falha ao gerar meme.', variant: 'destructive' });
    } finally {
      setIsMemeLoading(false);
    }
  };

  // --- IMAGE ANALYSIS ---
  const analysisPrompts: Record<string, string> = {
    describe: 'Descreva detalhadamente o que você vê nesta imagem, incluindo cores, objetos, pessoas, cenário e atmosfera. Responda em português.',
    objects: 'Liste todos os objetos visíveis nesta imagem, organizados por categoria. Responda em português.',
    text: 'Extraia todo o texto visível nesta imagem. Se não houver texto, diga isso. Responda em português.',
    mood: 'Analise o sentimento, atmosfera e emoções transmitidas por esta imagem. Descreva o mood e as sensações que ela evoca. Responda em português.',
  };

  const handleAnalyzeImage = async () => {
    if (!imageUrl.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const response = await window.puter.ai.chat(
        analysisPrompts[analysisType],
        imageUrl,
        { model: 'x-ai/grok-4-1-fast' }
      );
      setAnalysisResult(response.message.content);
    } catch (error: any) {
      toast({ title: 'Erro na Análise', description: error.message || 'Falha ao analisar imagem.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- CREATIVE WRITING ---
  const handleCreativeWrite = async () => {
    if (!creativePrompt.trim() || isCreativeLoading) return;
    setIsCreativeLoading(true);
    setCreativeResult('');

    try {
      const style = CREATIVE_STYLES.find(s => s.id === creativeStyle);
      const messages = [
        { role: 'system' as const, content: style?.system || 'Você é um escritor criativo.' },
        { role: 'user' as const, content: creativePrompt },
      ];
      const response = await window.puter.ai.chat(messages, {
        model: selectedModel,
        temperature,
        max_tokens: 2000,
      });
      setCreativeResult(response.message.content);
    } catch (error: any) {
      toast({ title: 'Erro na Escrita', description: error.message || 'Falha ao gerar texto.', variant: 'destructive' });
    } finally {
      setIsCreativeLoading(false);
    }
  };

  // --- TEXT TO SPEECH ---
  const handleTTS = async () => {
    if (!ttsText.trim() || isTtsLoading) return;
    setIsTtsLoading(true);

    try {
      const audio = await window.puter.ai.txt2speech(ttsText);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = audio;
      audio.play();
    } catch (error: any) {
      toast({ title: 'Erro no TTS', description: error.message || 'Falha ao gerar áudio.', variant: 'destructive' });
    } finally {
      setIsTtsLoading(false);
    }
  };

  const handleDownloadImage = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <img src={mascotImg} alt="Ramu" className="w-10 h-10" width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                  RAMDUT AI Lab
                </h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Assistente: <strong>Ramu</strong> 🤖</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:flex gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by Grok + Gemini
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero with mascot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 relative"
        >
          <motion.img
            src={mascotImg}
            alt="Ramu - Mascote IA"
            className="w-24 h-24 mx-auto mb-4"
            width={96}
            height={96}
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Olá, eu sou o <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ramu</span>! 🤖
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Seu assistente de IA no RAMDUT Lab. Chat inteligente, geração de imagens HD, 
            criação de memes, análise visual, escrita criativa e texto para fala — tudo gratuito!
          </p>
        </motion.div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="chat" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat IA</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="image-gen" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Imagens</span>
              <span className="sm:hidden">Img</span>
            </TabsTrigger>
            <TabsTrigger value="meme" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <Laugh className="h-4 w-4" />
              <span className="hidden sm:inline">Memes</span>
              <span className="sm:hidden">Meme</span>
            </TabsTrigger>
            <TabsTrigger value="image-analysis" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Análise</span>
              <span className="sm:hidden">Análise</span>
            </TabsTrigger>
            <TabsTrigger value="creative" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Escrita</span>
              <span className="sm:hidden">Escrita</span>
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-1.5 py-3 text-xs sm:text-sm">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">TTS</span>
              <span className="sm:hidden">TTS</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== CHAT TAB ========== */}
          <TabsContent value="chat">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src={mascotImg} alt="Ramu" className="w-6 h-6" width={24} height={24} />
                  Chat com Ramu
                </CardTitle>
                <CardDescription>
                  Converse com o Ramu usando os melhores modelos Grok. Suporta conversas multi-turno.
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  {models.map(m => (
                    <Badge
                      key={m.id}
                      variant={selectedModel === m.id ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => setSelectedModel(m.id)}
                    >
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-y-auto border border-border rounded-lg p-4 mb-4 bg-muted/30 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <motion.img
                        src={mascotImg}
                        alt="Ramu"
                        className="w-16 h-16 mb-3 opacity-50"
                        width={64}
                        height={64}
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                      />
                      <p className="font-medium">Oi! Eu sou o Ramu 👋</p>
                      <p className="text-sm">Envie uma mensagem para começar!</p>
                    </div>
                  )}
                  <AnimatePresence>
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.role === 'assistant' && (
                          <img src={mascotImg} alt="Ramu" className="w-8 h-8 shrink-0" width={32} height={32} />
                        )}
                        <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border text-foreground'
                        }`}>
<div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-accent" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isChatLoading && (
                    <div className="flex gap-3">
                      <motion.img
                        src={mascotImg}
                        alt="Ramu pensando"
                        className="w-8 h-8 shrink-0"
                        width={32}
                        height={32}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                      <div className="bg-card border border-border rounded-xl px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pergunte algo ao Ramu..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isChatLoading}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={isChatLoading || !chatInput.trim()}>
                    {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={() => setChatMessages([])} disabled={chatMessages.length === 0}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== IMAGE GENERATION TAB ========== */}
          <TabsContent value="image-gen">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="h-5 w-5 text-primary" />
                  Geração de Imagens HD
                </CardTitle>
                <CardDescription>
                  Crie imagens de alta qualidade com Google Gemini. Escolha modelos e estilos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Model selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Modelo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_MODELS.map(m => (
                      <Badge
                        key={m.id}
                        variant={selectedImageModel === m.id ? 'default' : 'outline'}
                        className="cursor-pointer transition-all hover:scale-105 gap-1"
                        onClick={() => setSelectedImageModel(m.id)}
                      >
                        <m.icon className="h-3 w-3" />
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Style selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">🎨 Estilo</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {IMAGE_STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className={`text-xs rounded-lg py-2 px-2 border transition-all text-center ${
                          selectedStyle === s.id
                            ? 'border-primary bg-primary/10 text-foreground font-medium'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja criar... Ex: Um dragão cristalino voando sobre uma cidade futurista ao pôr do sol"
                  rows={3}
                />
                <Button
                  onClick={handleGenerateImage}
                  disabled={isImageLoading || !imagePrompt.trim()}
                  className="w-full"
                >
                  {isImageLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando imagem HD...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Gerar Imagem</>
                  )}
                </Button>

                {generatedImageSrc && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={generatedImageSrc} alt="Imagem gerada" className="w-full" loading="lazy" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleDownloadImage(generatedImageSrc, 'ramdut-image.png')}>
                        <Download className="h-4 w-4 mr-2" /> Baixar
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={handleGenerateImage}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== MEME TAB ========== */}
          <TabsContent value="meme">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laugh className="h-5 w-5 text-primary" />
                  Gerador de Memes 🔥
                </CardTitle>
                <CardDescription>
                  Crie memes engraçados e virais com IA. Escolha templates ou crie do zero!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">📋 Template</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MEME_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedMemeTemplate(t.id)}
                        className={`text-xs rounded-lg py-2 px-3 border transition-all ${
                          selectedMemeTemplate === t.id
                            ? 'border-primary bg-primary/10 text-foreground font-medium'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={memeTopText}
                    onChange={(e) => setMemeTopText(e.target.value)}
                    placeholder="Texto de cima..."
                  />
                  <Input
                    value={memeBottomText}
                    onChange={(e) => setMemeBottomText(e.target.value)}
                    placeholder="Texto de baixo..."
                  />
                </div>

                <Textarea
                  value={memePrompt}
                  onChange={(e) => setMemePrompt(e.target.value)}
                  placeholder="Descreva o meme... Ex: Um gato programador frustrado olhando para o código com bugs"
                  rows={2}
                />

                <Button
                  onClick={handleGenerateMeme}
                  disabled={isMemeLoading || (!memePrompt.trim() && !memeTopText.trim())}
                  className="w-full"
                >
                  {isMemeLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando meme...</>
                  ) : (
                    <><Laugh className="h-4 w-4 mr-2" />Gerar Meme 🔥</>
                  )}
                </Button>

                {generatedMemeSrc && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={generatedMemeSrc} alt="Meme gerado" className="w-full" loading="lazy" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleDownloadImage(generatedMemeSrc, 'ramdut-meme.png')}>
                        <Download className="h-4 w-4 mr-2" /> Baixar Meme
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={handleGenerateMeme}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Novo Meme
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== IMAGE ANALYSIS TAB ========== */}
          <TabsContent value="image-analysis">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Análise Avançada de Imagens
                </CardTitle>
                <CardDescription>
                  Analise imagens com diferentes modos: descrição, objetos, texto (OCR) e humor/sentimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Analysis type */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'describe' as const, label: '📝 Descrever', },
                    { id: 'objects' as const, label: '📦 Objetos', },
                    { id: 'text' as const, label: '🔤 Extrair Texto', },
                    { id: 'mood' as const, label: '🎭 Sentimento', },
                  ].map(t => (
                    <Badge
                      key={t.id}
                      variant={analysisType === t.id ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => setAnalysisType(t.id)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Cole a URL da imagem..."
                    className="flex-1"
                  />
                  <Button onClick={handleAnalyzeImage} disabled={isAnalyzing || !imageUrl.trim()}>
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border max-h-64">
                    <img
                      src={imageUrl}
                      alt="Imagem para análise"
                      className="w-full h-full object-contain"
                      onError={() => toast({ title: 'URL inválida', variant: 'destructive' })}
                    />
                  </div>
                )}
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted/50 rounded-lg p-4 border border-border"
                  >
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <img src={mascotImg} alt="Ramu" className="w-5 h-5" width={20} height={20} />
                      Resultado da Análise
                    </h4>
                    <div className="text-sm text-foreground">
<div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== CREATIVE WRITING TAB ========== */}
          <TabsContent value="creative">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Escrita Criativa Pro
                </CardTitle>
                <CardDescription>
                  Gere textos com estilos, controle de criatividade e formatação avançada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Style selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">✍️ Estilo de Escrita</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {CREATIVE_STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setCreativeStyle(s.id)}
                        className={`text-xs rounded-lg py-2 px-2 border transition-all text-center ${
                          creativeStyle === s.id
                            ? 'border-primary bg-primary/10 text-foreground font-medium'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-3 border border-border">
                  <ThermometerSun className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Criatividade</span>
                      <span className="font-medium text-foreground">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>🎯 Focado</span>
                      <span>🌈 Criativo</span>
                    </div>
                  </div>
                </div>

                <Textarea
                  value={creativePrompt}
                  onChange={(e) => setCreativePrompt(e.target.value)}
                  placeholder="Descreva o que deseja criar... Ex: Escreva um conto de ficção científica sobre um hacker que descobre que vive em uma simulação"
                  rows={4}
                />

                <Button
                  onClick={handleCreativeWrite}
                  disabled={isCreativeLoading || !creativePrompt.trim()}
                  className="w-full"
                >
                  {isCreativeLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando...</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" />Gerar Texto</>
                  )}
                </Button>

                {creativeResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted/50 rounded-lg p-6 border border-border"
                  >
                    <div className="text-sm text-foreground leading-relaxed">
<div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{creativeResult}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TEXT TO SPEECH TAB ========== */}
          <TabsContent value="tts">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Texto para Fala (TTS)
                </CardTitle>
                <CardDescription>
                  Converta texto em áudio natural. Ideal para narração, acessibilidade e criação de conteúdo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '📢 Notícia', text: 'Última hora: cientistas descobrem nova forma de energia sustentável que pode revolucionar o mundo.' },
                    { label: '📖 Narração', text: 'Era uma noite escura e tempestuosa. O vento uivava entre as árvores enquanto uma figura solitária caminhava pela estrada.' },
                    { label: '😂 Piada', text: 'Por que o programador usa óculos? Porque ele não consegue C#! Ba dum tss!' },
                    { label: '🎤 Rap', text: 'Yo, sou o Ramu no mic, inteligência artificial, gerando rimas que são fenomenal, digital e genial!' },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setTtsText(preset.text)}
                      className="text-xs rounded-lg py-2 px-3 border border-border bg-card text-muted-foreground hover:border-primary/50 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Digite o texto que deseja ouvir..."
                  rows={4}
                />

                <Button
                  onClick={handleTTS}
                  disabled={isTtsLoading || !ttsText.trim()}
                  className="w-full"
                >
                  {isTtsLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando áudio...</>
                  ) : (
                    <><Volume2 className="h-4 w-4 mr-2" />🔊 Reproduzir</>
                  )}
                </Button>

                <div className="bg-muted/30 rounded-lg p-4 border border-border text-sm text-muted-foreground flex items-start gap-3">
                  <img src={mascotImg} alt="Ramu" className="w-8 h-8 shrink-0" width={32} height={32} />
                  <p>💡 O áudio será reproduzido automaticamente. Certifique-se de que o volume está ligado. Use os presets acima para testar rapidamente!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.img
              src={mascotImg}
              alt="Ramu"
              className="w-12 h-12"
              width={48}
              height={48}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5 }}
            />
            <div>
              <p className="font-bold text-foreground">Ramu AI Assistant</p>
              <p className="text-xs text-muted-foreground">Gratuito e ilimitado via Puter.js + Google Gemini</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { name: 'Grok 4.20', desc: 'Chat avançado' },
              { name: 'Grok 4.1 Fast', desc: 'Rápido' },
              { name: 'Gemini 2.5', desc: 'Imagens HD' },
              { name: 'Meme Gen', desc: 'Criar memes' },
              { name: 'Análise IA', desc: 'Visão + OCR' },
              { name: 'TTS', desc: 'Texto → Voz' },
            ].map((m, i) => (
              <Card key={i} className="border-border text-center">
                <CardContent className="pt-3 pb-3">
                  <p className="font-semibold text-foreground text-xs">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AITools;
