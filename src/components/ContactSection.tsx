import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  Github, 
  Linkedin, 
  Twitter,
  MessageCircle
} from 'lucide-react';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: 'jaques.dutra@example.com',
      href: 'mailto:jaques.dutra@example.com'
    },
    {
      icon: MapPin,
      label: 'Localização',
      value: 'Novo Hamburgo, RS - Brasil',
      href: '#'
    },
    {
      icon: Phone,
      label: 'Telefone',
      value: '+55 (51) 99999-9999',
      href: 'tel:+5551999999999'
    }
  ];

  const socialLinks = [
    {
      icon: Github,
      label: 'GitHub',
      href: 'https://github.com/Toniakbanares',
      color: 'hover:text-gray-900 dark:hover:text-white'
    },
    {
      icon: Linkedin,
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/jaques-dutra-14b805226',
      color: 'hover:text-blue-600'
    },
    {
      icon: Twitter,
      label: 'Twitter',
      href: 'https://x.com/jasu_sn?s=09',
      color: 'hover:text-sky-500'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Mensagem enviada!",
        description: "Obrigado pelo contato. Retornarei em breve!",
      });

      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro. Tente novamente ou use outro meio de contato.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Vamos Conversar
          </h2>
          <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full mb-8" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Interessado em uma colaboração ou apenas quer bater um papo sobre tecnologia? 
            Ficarei feliz em conversar!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center">
                <MessageCircle className="mr-3 h-6 w-6 text-primary" />
                Entre em Contato
              </h3>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Estou sempre aberto a discutir novos projetos, oportunidades de trabalho 
                ou simplesmente trocar ideias sobre desenvolvimento e tecnologia. Não hesite 
                em entrar em contato!
              </p>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              {contactInfo.map((info) => (
                <Card 
                  key={info.label}
                  className="p-4 bg-card/50 backdrop-blur-sm border-muted hover:border-primary/30 transition-all duration-300 hover:shadow-card group"
                >
                  <a 
                    href={info.href}
                    className="flex items-center gap-4 group-hover:text-primary transition-colors duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <info.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{info.label}</p>
                      <p className="text-sm text-muted-foreground">{info.value}</p>
                    </div>
                  </a>
                </Card>
              ))}
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">
                Conecte-se comigo
              </h4>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group p-3 rounded-full border border-muted hover:border-primary transition-all duration-300 hover:scale-110 hover:shadow-glow bg-card/50 backdrop-blur-sm ${social.color}`}
                    aria-label={social.label}
                  >
                    <social.icon className="h-6 w-6 transition-colors duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <div className="p-6 bg-gradient-hero rounded-lg border border-primary/20">
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Pronto para começar um projeto?
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                Vamos transformar suas ideias em realidade digital!
              </p>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                Iniciar Conversa
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="p-8 bg-card/50 backdrop-blur-sm border-muted">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-6">
                  Envie uma Mensagem
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-foreground mb-2 block">
                    Nome *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="transition-all duration-300 focus:border-primary focus:ring-primary"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                    Email *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="transition-all duration-300 focus:border-primary focus:ring-primary"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="text-sm font-medium text-foreground mb-2 block">
                  Assunto *
                </label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="transition-all duration-300 focus:border-primary focus:ring-primary"
                  placeholder="Sobre o que você gostaria de conversar?"
                />
              </div>

              <div>
                <label htmlFor="message" className="text-sm font-medium text-foreground mb-2 block">
                  Mensagem *
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="transition-all duration-300 focus:border-primary focus:ring-primary resize-none"
                  placeholder="Conte-me mais detalhes sobre seu projeto ou ideia..."
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 group"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    Enviar Mensagem
                  </div>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;