# Corrigir o Lab mobile e a qualidade das imagens

## Interface no celular
- Remover a ação duplicada do estado vazio e manter uma única barra de criação fixa.
- Evitar que a barra de criação dispute espaço com a navegação inferior no Lab.
- Ajustar áreas seguras e altura útil para que conteúdo, imagens e comandos não se sobreponham.
- Corrigir a visualização de imagens no Imagine/Studio para caber na tela sem ser coberta pelos comandos.

## Geração de imagens
- Retirar Pollinations do caminho de geração usado pelo usuário, eliminando a origem da marca d’água.
- Priorizar geração de alta qualidade via Lovable AI/Gemini e usar fal.ai como alternativa sem marca.
- Manter proporção e qualidade escolhidas e retornar um erro claro quando nenhum provedor sem marca estiver disponível.

## Validação
- Conferir o Lab e a tela de imagens em largura de celular.
- Verificar compilação e mensagens de erro após as mudanças.

## Detalhes técnicos
- Preservar os fluxos existentes de meme, edição, referência e vídeo.
- Não simular geração nem remover cobranças de provedores; apenas impedir resultados de baixa qualidade ou com marca.
