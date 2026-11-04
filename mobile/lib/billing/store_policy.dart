import 'package:flutter/foundation.dart';

/// App Store Guideline 3.1.1: no iOS buttons, links or prices that lead to purchases
/// outside the App Store (same rule as Procedy in production). Android keeps the plans
/// screen and the Asaas checkout handoff; on iOS the owner manages the plan on the site.
bool get showPurchaseEntryPoints => kIsWeb || defaultTargetPlatform != TargetPlatform.iOS;
