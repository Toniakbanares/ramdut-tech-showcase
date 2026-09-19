# Corrigir bloqueio por créditos no vídeo

## Objetivo
Evitar que a falta de saldo apareça como falha técnica ou tela quebrada, e impedir novas tentativas que não podem funcionar.

## Alterações
- Traduzir a resposta de saldo insuficiente para uma mensagem clara em português.
- Identificar o bloqueio como definitivo, sem repetição automática.
- Remover “Tentar novamente” dos vídeos recusados por falta de créditos.
- Desativar temporariamente “Gerar vídeo” após esse bloqueio, mantendo imagens, memes e demais recursos funcionando.
- Preservar os provedores e todo o fluxo de vídeo existente.

## Limite real
A cobrança não pode ser removida por código: Omni, Veo e fal.ai cobram pelo processamento. O saldo atual disponível para IA é 0,07 crédito, abaixo dos 3,24352 exigidos pelo vídeo mostrado. Não será criado um contorno de cobrança nem prometida geração gratuita inexistente.

## Validação
- Conferir o comportamento no celular após simular uma resposta 402.
- Confirmar que não há nova chamada ao tocar na ação bloqueada.
- Verificar a compilação e os erros da prévia.
