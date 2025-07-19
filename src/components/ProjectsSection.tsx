import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Github, Eye } from 'lucide-react';

const ProjectsSection = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const projects = [
    {
      title: 'PiSphere',
      description: 'Site demonstração focado no mercado de criptomoedas e controle financeiro com interface moderna e intuitiva.',
      image: '/api/placeholder/400/250',
      technologies: ['React', 'TypeScript', 'TailwindCSS', 'Chart.js'],
      category: 'frontend',
      liveUrl: 'https://toniakbanares.github.io/pisphere-harmony/',
      githubUrl: 'https://github.com/Toniakbanares/pisphere-harmony',
      featured: true
    },
    {
      title: 'RAMDUT Showcase',
      description: 'Blog pessoal e portfólio com integração das minhas redes sociais e conteúdo sobre tecnologia.',
      image: '/api/placeholder/400/250',
      technologies: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design'],
      category: 'frontend',
      liveUrl: 'https://toniakbanares.github.io/ramdut-showcase-website-jaques/',
      githubUrl: 'https://github.com/Toniakbanares/ramdut-showcase-website-jaques',
      featured: true
    },
    {
      title: 'Sistema de Gestão Acadêmica',
      description: 'Plataforma completa para gestão de estudantes, professores e cursos universitários com dashboard interativo.',
      image: '/api/placeholder/400/250',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      category: 'fullstack',
      liveUrl: '#',
      githubUrl: '#',
      featured: false
    },
    {
      title: 'API de Gerenciamento de Tarefas',
      description: 'API RESTful robusta para gerenciamento de projetos e tarefas com autenticação JWT.',
      image: '/api/placeholder/400/250',
      technologies: ['Python', 'FastAPI', 'MongoDB', 'Docker'],
      category: 'backend',
      liveUrl: '#',
      githubUrl: '#',
      featured: false
    }
  ];

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'backend', label: 'Backend' },
    { key: 'fullstack', label: 'Full Stack' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'ai', label: 'IA/ML' }
  ];

  const filteredProjects = activeFilter === 'all' 
    ? projects 
    : projects.filter(project => project.category === activeFilter);

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Meus Projetos
          </h2>
          <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full mb-8" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma seleção dos projetos que desenvolvi, mostrando diferentes tecnologias e soluções criativas.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "outline"}
              onClick={() => setActiveFilter(filter.key)}
              className={`transition-all duration-300 ${
                activeFilter === filter.key 
                  ? 'bg-gradient-primary hover:shadow-glow' 
                  : 'hover:border-primary hover:text-primary'
              }`}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <Card 
              key={project.title}
              className={`group overflow-hidden bg-card border-muted hover:border-primary/30 transition-all duration-500 hover:shadow-card hover:-translate-y-2 ${
                project.featured ? 'ring-2 ring-primary/20' : ''
              }`}
            >
              {/* Project Image */}
              <div className="relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Action Buttons */}
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    asChild
                  >
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    asChild
                  >
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Featured Badge */}
                {project.featured && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-gradient-primary text-white border-0">
                      Destaque
                    </Badge>
                  </div>
                )}
              </div>

              {/* Project Content */}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {project.description}
                </p>

                {/* Technologies */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech) => (
                    <Badge 
                      key={tech} 
                      variant="secondary"
                      className="text-xs bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>

                {/* Links */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 group/btn hover:border-primary hover:text-primary"
                    asChild
                  >
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform duration-300" />
                      Demo
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 group/btn hover:border-primary hover:text-primary"
                    asChild
                  >
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform duration-300" />
                      Código
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* View More */}
        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            size="lg"
            className="border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            asChild
          >
            <a href="https://github.com/Toniakbanares" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-5 w-5" />
              Ver mais no GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;