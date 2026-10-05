# Worqera no celular

App Flutter, no mesmo jeito de abrir da Procedy: o simulador sobe no Xcode (DeviceHub) e o `flutter run` gruda no aparelho que já está ligado.

A API no simulador iOS é `http://127.0.0.1:3001/api/v1`. No emulador Android é `http://10.0.2.2:3001/api/v1`. Outro endereço: `--dart-define=WORQERA_API_BASE=http://IP:3001/api/v1`.

## Abrir no iPhone 17 Pro Max

O Flutter deste repo pode ser o da Procedy:

```bash
export PATH="$HOME/Documents/Repo/procedy-platform/.tools/flutter/bin:$PATH"
cd mobile
./scripts/open-ios-sim.sh
flutter run -d "iPhone 17 Pro Max"
```

Se o simulador já estiver aberto, o `flutter run -d` sozinho basta.
