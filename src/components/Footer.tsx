import { useEffect } from 'react';
import { Github, Linkedin, Twitter, Heart, Code } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {}
  }, []);

  const socialLinks = [
    {
      icon: Github,
      href: 'https://github.com/Toniakbanares',
      label: 'GitHub'
    },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/in/jaques-dutra-14b805226',
      label: 'LinkedIn'
    },
    {
      icon: Twitter,
      href: 'https://x.com/jasu_sn?s=09',
      label: 'Twitter'
    }
  ];

  const quickLinks = [
    { label: 'Sobre', href: '#about' },
    { label: 'Projetos', href: '#projects' },
    { label: 'Habilidades', href: '#skills' },
    { label: 'Contato', href: '#contact' }
  ];

  return (
    <footer className="bg-card border-t border-muted">
      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                RAMDUT
              </h3>
              <p className="text-muted-foreground mt-2">
                Jaques Dutra - Desenvolvedor Full Stack
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Criando soluções digitais inovadoras e experiências de usuário excepcionais. 
              Sempre em busca de novos desafios e aprendizado contínuo.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-2 rounded-full border border-muted hover:border-primary transition-all duration-300 hover:scale-110 hover:shadow-glow bg-background"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              Navegação Rápida
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              Informações de Contato
            </h4>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                📧 <a href="mailto:protonramdut2026@proton.me" className="hover:text-primary transition-colors">protonramdut2026@proton.me</a>
              </p>
              <p className="text-muted-foreground">
                📍 Novo Hamburgo, RS - Brasil
              </p>
              <p className="text-muted-foreground">
                🎓 Universidade Feevale
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AdSense Space */}
      <div className="border-t border-muted bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="bg-gradient-secondary rounded-lg p-8 border border-muted flex justify-center">
              <ins className="adsbygoogle"
                style={{ display: 'inline-block', width: 728, height: 90 }}
                data-ad-client="ca-pub-6011474845504842"
                data-ad-slot="1367604945"></ins>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-muted bg-background">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© {currentYear} Jaques Dutra. Feito com</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>e</span>
              <Code className="h-4 w-4 text-primary" />
              <span>usando React + TypeScript</span>
            </div>
            
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors duration-300">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-primary transition-colors duration-300">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;