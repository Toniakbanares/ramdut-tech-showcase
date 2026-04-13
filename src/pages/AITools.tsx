import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Bot, User, Loader2, Sparkles, MessageSquare, 
  ArrowLeft, Trash2, ImagePlus, Eye, Wand2, ThermometerSun, Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    puter: any;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Image analysis state
  const [imageUrl, setImageUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Creative writing state
  const [creativePrompt, setCreativePrompt] = useState('');
  const [creativeResult, setCreativeResult] = useState('');
  const [isCreativeLoading, setIsCreativeLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

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

  // --- IMAGE GENERATION (fixed: append HTMLImageElement directly) ---
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    // Clear previous image
    if (imageContainerRef.current) {
      imageContainerRef.current.innerHTML = '';
    }

    try {
      const image = await window.puter.ai.txt2img(imagePrompt);
      // txt2img returns an HTMLImageElement — append it directly
      if (image && imageContainerRef.current) {
        image.style.width = '100%';
        image.style.borderRadius = '8px';
        image.alt = 'Imagem gerada por IA';
        imageContainerRef.current.appendChild(image);
      }
    } catch (error: any) {
      toast({ title: 'Erro na Geração', description: error.message || 'Falha ao gerar imagem.', variant: 'destructive' });
    } finally {
      setIsImageLoading(false);
    }
  };

  // --- IMAGE ANALYSIS ---
  const handleAnalyzeImage = async () => {
    if (!imageUrl.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const response = await window.puter.ai.chat(
        'Descreva detalhadamente o que você vê nesta imagem. Responda em português.',
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
      const response = await window.puter.ai.chat(creativePrompt, {
        model: selectedModel,
        temperature,
        max_tokens: 1000,
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
      // audio is an HTMLAudioElement
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                RAMDUT AI Lab
              </h1>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            Powered by Puter.js + Grok
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Laboratório de Inteligência Artificial
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore funcionalidades de IA gratuitas e ilimitadas com a API Grok via Puter.js.
            Chat, geração de imagens, análise visual, escrita criativa e texto para fala.
          </p>
        </motion.div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
            <TabsTrigger value="chat" className="flex items-center gap-2 py-3">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat IA</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="image-gen" className="flex items-center gap-2 py-3">
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Gerar Imagem</span>
              <span className="sm:hidden">Imagem</span>
            </TabsTrigger>
            <TabsTrigger value="image-analysis" className="flex items-center gap-2 py-3">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Analisar Imagem</span>
              <span className="sm:hidden">Análise</span>
            </TabsTrigger>
            <TabsTrigger value="creative" className="flex items-center gap-2 py-3">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Escrita Criativa</span>
              <span className="sm:hidden">Escrita</span>
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-2 py-3">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">Texto para Fala</span>
              <span className="sm:hidden">TTS</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== CHAT TAB ========== */}
          <TabsContent value="chat">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Chat com Grok AI
                </CardTitle>
                <CardDescription>
                  Converse com a IA Grok. Suporta conversas multi-turno com contexto.
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  {models.map(m => (
                    <Badge
                      key={m.id}
                      variant={selectedModel === m.id ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
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
                      <Bot className="h-12 w-12 mb-3 opacity-30" />
                      <p>Envie uma mensagem para começar!</p>
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
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border text-foreground'
                        }`}>
                          {msg.content}
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
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
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
                    placeholder="Digite sua mensagem..."
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
                  Geração de Imagens
                </CardTitle>
                <CardDescription>
                  Crie imagens únicas a partir de descrições em texto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja criar... Ex: Um gato astronauta flutuando no espaço com a Terra ao fundo"
                  rows={3}
                />
                <Button
                  onClick={handleGenerateImage}
                  disabled={isImageLoading || !imagePrompt.trim()}
                  className="w-full"
                >
                  {isImageLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Gerando imagem...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Imagem
                    </>
                  )}
                </Button>

                <div
                  ref={imageContainerRef}
                  className="rounded-lg overflow-hidden border border-border empty:hidden"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== IMAGE ANALYSIS TAB ========== */}
          <TabsContent value="image-analysis">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Análise de Imagens
                </CardTitle>
                <CardDescription>
                  Cole a URL de uma imagem e a IA irá descrevê-la detalhadamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Cole a URL da imagem... Ex: https://exemplo.com/foto.jpg"
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
                      <Bot className="h-4 w-4 text-primary" />
                      Resultado da Análise
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{analysisResult}</p>
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
                  Escrita Criativa
                </CardTitle>
                <CardDescription>
                  Gere textos criativos com controle de temperatura (criatividade) e modelo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-3 border border-border">
                  <ThermometerSun className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Temperatura (Criatividade)</span>
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
                      <span>Focado</span>
                      <span>Criativo</span>
                    </div>
                  </div>
                </div>

                <Textarea
                  value={creativePrompt}
                  onChange={(e) => setCreativePrompt(e.target.value)}
                  placeholder="Escreva um prompt criativo... Ex: Escreva um poema sobre programação em estilo cyberpunk"
                  rows={4}
                />

                <Button
                  onClick={handleCreativeWrite}
                  disabled={isCreativeLoading || !creativePrompt.trim()}
                  className="w-full"
                >
                  {isCreativeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Gerar Texto Criativo
                    </>
                  )}
                </Button>

                {creativeResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted/50 rounded-lg p-6 border border-border"
                  >
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {creativeResult}
                    </p>
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
                  Converta texto em áudio usando a API de Text-to-Speech do Puter.js.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Digite o texto que deseja ouvir... Ex: Olá, bem-vindo ao RAMDUT AI Lab!"
                  rows={4}
                />

                <Button
                  onClick={handleTTS}
                  disabled={isTtsLoading || !ttsText.trim()}
                  className="w-full"
                >
                  {isTtsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Gerando áudio...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Reproduzir Áudio
                    </>
                  )}
                </Button>

                <div className="bg-muted/30 rounded-lg p-4 border border-border text-sm text-muted-foreground">
                  <p>💡 O áudio será reproduzido automaticamente no navegador. Certifique-se de que o volume está ligado.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Models info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 mb-8"
        >
          <h3 className="text-xl font-bold text-foreground mb-4 text-center">Modelos Disponíveis</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { name: 'Grok 4.20', desc: 'Último modelo' },
              { name: 'Grok 4.1 Fast', desc: 'Rápido' },
              { name: 'Grok 3', desc: 'Alta qualidade' },
              { name: 'Grok 2 Image', desc: 'Geração de imagens' },
              { name: 'TTS', desc: 'Texto para fala' },
            ].map((m, i) => (
              <Card key={i} className="border-border text-center">
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold text-foreground text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
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
