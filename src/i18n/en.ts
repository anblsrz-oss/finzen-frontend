// Diccionario inglés. Las claves son el texto en español (claves naturales);
// si una clave no está aquí, i18next cae al español (fallbackLng: 'es').
// Interpolaciones con {{var}} se conservan igual en ambos idiomas.

export const en: Record<string, string> = {
  // Navegación
  Resumen: 'Summary',
  Cuentas: 'Accounts',
  Tarjetas: 'Cards',
  Transacciones: 'Transactions',
  'Movs.': 'Txns',
  Importar: 'Import',
  'Escanear recibo': 'Scan receipt',
  Recibos: 'Receipts',
  Familia: 'Family',
  'Sincronizar correo': 'Sync email',
  Correo: 'Email',
  'Sincronizar SMS': 'Sync SMS',
  SMS: 'SMS',
  'Conexión automática': 'Auto connection',
  Conectar: 'Connect',
  Categorías: 'Categories',
  Rendimientos: 'Yields',
  'Rendim.': 'Yields',
  Reportes: 'Reports',
  Configuración: 'Settings',
  Ajustes: 'Settings',
  Admin: 'Admin',
  Más: 'More',
  'Más opciones': 'More options',
  Usuario: 'User',

  // Común
  Cancelar: 'Cancel',
  Crear: 'Create',
  Editar: 'Edit',
  Eliminar: 'Delete',
  'Guardando…': 'Saving…',
  'Eliminando…': 'Deleting…',
  'Cargando…': 'Loading…',
  Aceptar: 'Accept',
  Rechazar: 'Decline',
  Invitar: 'Invite',
  'Cargando usuarios...': 'Loading users...',
  'Error:': 'Error:',
  'Error desconocido': 'Unknown error',
  'No hay sesión activa': 'No active session',
  Tipo: 'Type',
  Monto: 'Amount',
  Moneda: 'Currency',
  Fecha: 'Date',
  Concepto: 'Concept',
  Categoría: 'Category',
  'Sin categoría': 'No category',
  'Sin concepto': 'No concept',
  Cuenta: 'Account',
  'O tarjeta': 'Or card',
  'Selecciona una cuenta': 'Select an account',
  'Selecciona una tarjeta': 'Select a card',
  Ingreso: 'Income',
  Egreso: 'Expense',
  Verificado: 'Verified',
  'Sin banco': 'No bank',
  'Sin marca': 'No brand',

  // Login
  'Organiza tus ingresos, gastos y cuentas en un solo lugar.':
    'Organize your income, expenses and accounts in one place.',
  'Continuar con Google': 'Continue with Google',
  'Al continuar aceptas el manejo de tus datos según la política de privacidad.':
    'By continuing you accept the handling of your data according to the privacy policy.',

  // Dashboard / Reportes
  'Vista general de tus ingresos, egresos y balance.':
    'Overview of your income, expenses and balance.',
  'Total Ingresos': 'Total Income',
  'Total Egresos': 'Total Expenses',
  Balance: 'Balance',
  'Ingresos vs Egresos': 'Income vs Expenses',
  'Gastos por Categoría': 'Expenses by Category',
  'Sin transacciones este mes.': 'No transactions this month.',
  'Sin transacciones en este período.': 'No transactions in this period.',
  'Gráficas de ingresos y gastos por período, cuenta y tarjeta.':
    'Income and expense charts by period, account and card.',
  'Rango de fechas': 'Date range',
  Desde: 'From',
  Hasta: 'To',
  'Premium: filtra por rango de fechas personalizado, cuenta o tarjeta. Actualiza tu plan para más análisis.':
    'Premium: filter by custom date range, account or card. Upgrade your plan for more analytics.',

  // Transacciones
  'Ingresos, egresos y transferencias entre tus cuentas.':
    'Income, expenses and transfers between your accounts.',
  'Ocultar historial': 'Hide history',
  'Historial ({{count}})': 'History ({{count}})',
  '+ Nueva transacción': '+ New transaction',
  'Historial de transacciones eliminadas': 'Deleted transactions history',
  'Aún no has eliminado ninguna.': "You haven't deleted any yet.",
  eliminada: 'deleted',
  'Motivo:': 'Reason:',
  'Sin transacciones. Registra una para empezar.':
    'No transactions. Add one to get started.',
  Pendiente: 'Pending',
  'Eliminar transacción': 'Delete transaction',
  'Vas a eliminar': 'You are about to delete',
  por: 'for',
  'El balance de tus cuentas se ajustará automáticamente.':
    'Your account balances will adjust automatically.',
  'Motivo de la eliminación': 'Reason for deletion',
  'Ej. Registrada por error, duplicada, monto incorrecto…':
    'E.g. Recorded by mistake, duplicated, wrong amount…',
  'Escribe el motivo de la eliminación.': 'Write the reason for deletion.',

  // TransactionForm
  '📥 Ingreso': '📥 Income',
  '📤 Egreso': '📤 Expense',
  '🔄 Transferencia': '🔄 Transfer',
  'Ej: Almuerzo': 'E.g. Lunch',
  'Cuenta destino': 'Destination account',
  Requerida: 'Required',
  'Cuenta origen': 'Source account',
  'Selecciona origen': 'Select source',
  'Selecciona destino': 'Select destination',
  'Selecciona la cuenta destino': 'Select the destination account',
  'Selecciona una cuenta o tarjeta': 'Select an account or card',
  'Selecciona cuenta origen y destino': 'Select source and destination accounts',
  'Las cuentas no pueden ser la misma': 'The accounts cannot be the same',
  Compra: 'Purchase',
  Familiar: 'Family',
  'Este gasto se registrará en el plan familiar, no en tus finanzas personales.':
    'This expense will be recorded in the family plan, not in your personal finances.',
  'Gasto familiar (se registra en el plan familiar)':
    'Family expense (recorded in the family plan)',
  'Meses sin intereses / Diferido': 'Interest-free months / Deferred',
  Meses: 'Months',
  'Interés ($)': 'Interest ($)',
  'Notas (opcional)': 'Notes (optional)',
  'Detalles adicionales...': 'Additional details...',
  Registrar: 'Save',

  // Recibos
  'Toma una foto del ticket y registra el gasto automáticamente':
    'Take a photo of the receipt and record the expense automatically',
  'Fotografía el ticket con buena luz y lo más plano posible. Después podrás revisar y corregir los datos detectados.':
    'Photograph the receipt with good light and as flat as possible. Then you can review and correct the detected data.',
  'Tomar foto': 'Take photo',
  'o subir una imagen existente': 'or upload an existing image',
  'Leyendo el ticket…': 'Reading the receipt…',
  'Revisa y corrige los datos': 'Review and correct the data',
  'Concepto / comercio': 'Concept / merchant',
  'Ej: Supermercado': 'E.g. Supermarket',
  'Registrar gasto': 'Save expense',
  'Ocultar texto detectado': 'Hide detected text',
  'Ver texto detectado': 'See detected text',
  '(sin texto)': '(no text)',
  'Gasto registrado correctamente.': 'Expense recorded successfully.',
  'Escanear otro': 'Scan another',
  'Ver movimientos': 'See transactions',
  'error desconocido': 'unknown error',
  'Este recibo ya fue registrado (movimiento duplicado).':
    'This receipt was already recorded (duplicate transaction).',
  'No se pudo leer el ticket: {{error}}. Revisa tu conexión (la primera vez se descarga el motor OCR) e intenta de nuevo.':
    'Could not read the receipt: {{error}}. Check your connection (the OCR engine is downloaded the first time) and try again.',

  // Familia
  'Comparte tarjetas con tu familia y lleven los gastos juntos':
    'Share cards with your family and track expenses together',
  'Te invitaron a la familia': 'You were invited to the family',
  'Sin nombre': 'No name',
  'Crear plan familiar': 'Create family plan',
  'Como jefe de familia podrás invitar a tus familiares por correo y compartirles tus tarjetas de crédito. Ellos registran sus gastos y tú mantienes el control: solo tú ves el límite de tus tarjetas.':
    'As family head you can invite your relatives by email and share your credit cards with them. They record their expenses and you stay in control: only you see your cards’ limits.',
  'Nombre de la familia': 'Family name',
  'Función Premium': 'Premium feature',
  'El plan familiar permite al jefe de familia compartir tarjetas con sus familiares y llevar los gastos del hogar por separado. Hazte Premium para crear tu familia. (Ser miembro invitado no requiere Premium.)':
    'The family plan lets the family head share cards with relatives and track household expenses separately. Go Premium to create your family. (Being an invited member does not require Premium.)',
  miembros: 'members',
  'Salir de la familia': 'Leave the family',
  '¿Salir de la familia? Tus gastos familiares pasados seguirán en el historial de la familia.':
    'Leave the family? Your past family expenses will remain in the family history.',
  'Ese correo ya fue invitado.': 'That email was already invited.',
  '¿Quitar a {{name}}? Sus gastos familiares pasados se conservan en el historial.':
    'Remove {{name}}? Their past family expenses are kept in the history.',
  'Aún no hay miembros.': 'No members yet.',
  'Invita a alguien con su correo.': 'Invite someone with their email.',
  'Tarjetas compartidas': 'Shared cards',
  'No tienes tarjetas de crédito registradas. Crea una en Tarjetas para poder compartirla.':
    "You have no credit cards registered. Create one in Cards to share it.",
  'Gasto familiar:': 'Family spend:',
  'Disponible total:': 'Total available:',
  'Dejar de compartir': 'Stop sharing',
  Compartir: 'Share',
  'El jefe de familia aún no comparte tarjetas.':
    "The family head hasn't shared cards yet.",
  'Gasto familiar acumulado:': 'Accumulated family spend:',
  'Registra gastos con estas tarjetas desde Transacciones eligiendo la tarjeta marcada como familiar.':
    'Record expenses with these cards from Transactions by choosing the card marked as family.',
  'Movimientos familiares': 'Family transactions',
  'Todavía no hay gastos familiares registrados.':
    'No family expenses recorded yet.',
  Miembro: 'Member',
  Tarjeta: 'Card',
  Activo: 'Active',
  Rechazó: 'Declined',

  // Cuentas
  'Tus cuentas y bancos, con saldo y rendimientos.':
    'Your accounts and banks, with balance and yields.',
  '+ Agregar cuenta': '+ Add account',
  '¿Eliminar esta cuenta?': 'Delete this account?',
  'Sin cuentas. Crea una para empezar.': 'No accounts. Create one to get started.',
  'Rendimiento:': 'Yield:',
  mensual: 'monthly',
  'Se implementa en Fase 3': 'Implemented in Phase 3',
  'Plan gratis: máximo 2 cuentas. Actualiza a Premium para agregar más.':
    'Free plan: max 2 accounts. Upgrade to Premium to add more.',
  // AccountForm
  'Nombre de la cuenta': 'Account name',
  'Mi cuenta principal': 'My main account',
  'Banco (opcional)': 'Bank (optional)',
  'Banco X': 'Bank X',
  Corriente: 'Checking',
  Ahorro: 'Savings',
  Inversión: 'Investment',
  Efectivo: 'Cash',
  'Saldo inicial': 'Initial balance',
  'Esta cuenta genera rendimientos': 'This account generates yields',
  'Rendimiento mensual (%)': 'Monthly yield (%)',
  'Crear cuenta': 'Create account',

  // Tarjetas
  'Tarjetas de crédito y débito con límite, uso y fechas.':
    'Credit and debit cards with limit, usage and dates.',
  '+ Agregar tarjeta': '+ Add card',
  '¿Eliminar esta tarjeta?': 'Delete this card?',
  'Sin tarjetas. Crea una para empezar.': 'No cards. Create one to get started.',
  '💳 Crédito': '💳 Credit',
  '💰 Débito': '💰 Debit',
  'Ligada a:': 'Linked to:',
  'Corte:': 'Cut-off:',
  'Pago:': 'Payment:',
  Usado: 'Used',
  Límite: 'Limit',
  Disponible: 'Available',
  Saldo: 'Balance',
  'Plan gratis: máximo 2 tarjetas. Actualiza a Premium para agregar más.':
    'Free plan: max 2 cards. Upgrade to Premium to add more.',
  // CardForm
  'Nombre de la tarjeta': 'Card name',
  'Mi Visa': 'My Visa',
  'Marca (opcional)': 'Brand (optional)',
  'Visa, Mastercard...': 'Visa, Mastercard...',
  'Cuenta ligada': 'Linked account',
  'Límite de crédito': 'Credit limit',
  'Día de corte': 'Cut-off day',
  'Día de pago': 'Payment day',
  'Crear tarjeta': 'Create card',

  // Categorías
  'Clasifica tus ingresos y gastos.': 'Classify your income and expenses.',
  '+ Agregar categoría': '+ Add category',
  '¿Eliminar esta categoría?': 'Delete this category?',
  Nombre: 'Name',
  'Ej: Gasolina': 'E.g. Gas',
  'Ícono (emoji)': 'Icon (emoji)',
  'Mis categorías': 'My categories',
  'Categorías del sistema': 'System categories',
  'Sin categorías.': 'No categories.',

  // Rendimientos
  'Compara el crecimiento calculado contra el real.':
    'Compare the calculated growth against the actual one.',
  'Esta función es solo para Premium. Actualiza tu plan para usarla.':
    'This feature is Premium only. Upgrade your plan to use it.',
  'Sin cuentas con rendimiento. Crea una cuenta con opción de rendimiento en Cuentas.':
    'No accounts with yield. Create an account with the yield option in Accounts.',
  'Saldo actual': 'Current balance',
  'Crecimiento esperado': 'Expected growth',
  'Crecimiento real': 'Actual growth',
  Histórico: 'History',
  'Esperado:': 'Expected:',
  'Real:': 'Actual:',
  '¿Eliminar este registro?': 'Delete this record?',
  'Registra el crecimiento real': 'Record the actual growth',
  '(Editar)': '(Edit)',
  'de este mes': 'for this month',
  Mes: 'Month',
  'Crecimiento real ($)': 'Actual growth ($)',
  'vs esperado': 'vs expected',
  Actualizar: 'Update',
  Verificar: 'Verify',

  // Conexión
  'Sincroniza tus movimientos directo del banco, sin subir archivos.':
    'Sync your transactions straight from the bank, without uploading files.',
  'Premium · Próximamente': 'Premium · Coming soon',
  'Estamos preparando la conexión directa con bancos y SOFIPOs mediante un agregador de Open Finance. Mientras tanto, puedes traer tus movimientos gratis por dos vías:':
    'We are preparing direct connection with banks and SOFIPOs via an Open Finance aggregator. Meanwhile, you can bring your transactions for free in two ways:',
  'tu estado de cuenta (CSV) — todas las plataformas.':
    'your statement (CSV) — all platforms.',
  'de alertas del banco — casi en tiempo real.':
    "from your bank's alerts — near real time.",
  'de alerta — solo en la app de Android.':
    'alerts — only in the Android app.',
  'Leer SMS': 'Read SMS',
  'La conexión automática estará disponible en el plan Premium.':
    'Auto connection will be available on the Premium plan.',

  // Admin
  'Panel Admin': 'Admin Panel',
  'Gestiona usuarios y sus permisos de premium.':
    'Manage users and their premium permissions.',
  'Sin usuarios.': 'No users.',
  Email: 'Email',
  Estado: 'Status',
  Acciones: 'Actions',
  Gratis: 'Free',
  'Actualizando...': 'Updating...',
  'Quitar Premium': 'Remove Premium',
  'Dar Premium': 'Grant Premium',

  // Correo
  'Lee las alertas de tu banco desde tu Gmail y crea movimientos pendientes. Gratis y casi en tiempo real.':
    'Read your bank alerts from Gmail and create pending transactions. Free and near real time.',
  '1. Remitentes de tu banco': '1. Your bank senders',
  'Indica de qué correos llegan las alertas (ej.':
    'Indicate which emails the alerts come from (e.g.',
  'Solo se leen esos correos.': 'Only those emails are read.',
  Banco: 'Bank',
  'Remitentes (separados por coma)': 'Senders (comma separated)',
  'Regex de monto (opcional)': 'Amount regex (optional)',
  'Guardar remitente': 'Save sender',
  '2. Conecta Gmail y sincroniza': '2. Connect Gmail and sync',
  'Asignar a la cuenta (opcional)': 'Assign to account (optional)',
  'Sin cuenta': 'No account',
  'Conectar Gmail': 'Connect Gmail',
  'Gmail conectado': 'Gmail connected',
  'Sincronizando…': 'Syncing…',
  'Sincronizar ahora': 'Sync now',
  'Agrega al menos un remitente arriba antes de sincronizar.':
    'Add at least one sender above before syncing.',
  'Los movimientos se crean como pendientes: revísalos y confírmalos en Transacciones para que cuenten en tus saldos.':
    'Transactions are created as pending: review and confirm them in Transactions so they count in your balances.',
  'Correos encontrados: {{found}}. Movimientos nuevos (pendientes): {{inserted}}{{dups}}.':
    'Emails found: {{found}}. New transactions (pending): {{inserted}}{{dups}}.',
  ', {{n}} duplicados': ', {{n}} duplicates',

  // SMS
  'Lee las alertas de compra por SMS de tu banco. Disponible solo en la app de Android.':
    'Read your bank purchase alerts via SMS. Available only in the Android app.',
  '📵 Apple no permite que las apps lean SMS. En iPhone usa "Sincronizar correo" o "Importar" tu estado de cuenta.':
    '📵 Apple does not allow apps to read SMS. On iPhone use "Sync email" or "Import" your statement.',
  'Esta función solo está disponible en la app instalada de Android. En el navegador no se pueden leer SMS.':
    'This feature is only available in the installed Android app. SMS cannot be read in the browser.',
  '1. Remitentes de SMS de tu banco': '1. Your bank SMS senders',
  'Remitentes (coma)': 'Senders (comma)',
  '2. Leer SMS': '2. Read SMS',
  'Leyendo…': 'Reading…',
  'Leer SMS y crear pendientes': 'Read SMS and create pending',
  'Se pedirá permiso para leer SMS. Los movimientos se crean como pendientes; confírmalos en Transacciones.':
    'Permission to read SMS will be requested. Transactions are created as pending; confirm them in Transactions.',
  'SMS leídos: {{found}}. Movimientos nuevos (pendientes): {{inserted}}{{dups}}.':
    'SMS read: {{found}}. New transactions (pending): {{inserted}}{{dups}}.',

  // Importar
  'Importar movimientos': 'Import transactions',
  'Sube el estado de cuenta (CSV) de tu banco y conviértelo en transacciones. Tus datos no salen a terceros.':
    "Upload your bank's statement (CSV) and turn it into transactions. Your data isn't shared with third parties.",
  'Primero crea una cuenta para poder importar movimientos.':
    'First create an account to import transactions.',
  '1. Cuenta destino y archivo': '1. Destination account and file',
  'Usar mapeo guardado': 'Use saved mapping',
  'Nuevo mapeo…': 'New mapping…',
  'Archivo CSV': 'CSV file',
  '2. Mapea las columnas de {{file}}': '2. Map the columns of {{file}}',
  'La primera fila son encabezados': 'The first row are headers',
  'Columna de Fecha': 'Date column',
  'Formato de fecha': 'Date format',
  'Columna de Concepto': 'Concept column',
  'Formato de monto': 'Amount format',
  'Una columna con signo (+/-)': 'One column with sign (+/-)',
  'Columnas de cargo y abono': 'Debit and credit columns',
  'Columna de Monto': 'Amount column',
  'Columna de Cargo (egreso)': 'Debit column (expense)',
  'Columna de Abono (ingreso)': 'Credit column (income)',
  'Separador decimal': 'Decimal separator',
  'Punto (1,234.56)': 'Dot (1,234.56)',
  'Coma (1.234,56)': 'Comma (1.234,56)',
  'Categoría por defecto (opcional)': 'Default category (optional)',
  'Nombre del banco (para guardar el mapeo)': 'Bank name (to save the mapping)',
  'Ej. BBVA, Nu, Klar…': 'E.g. BBVA, Nu, Klar…',
  'Guardar mapeo': 'Save mapping',
  '— sin asignar —': '— unassigned —',
  'Columna {{n}}': 'Column {{n}}',
  '3. Previsualización ({{count}} movimientos)': '3. Preview ({{count}} transactions)',
  '({{n}} con error)': '({{n}} with error)',
  'Importando…': 'Importing…',
  'Confirmar e importar ({{count}})': 'Confirm and import ({{count}})',
  'Selecciona la cuenta destino para poder importar.':
    'Select the destination account to import.',
  'Mostrando 200 de {{total}}. Se importarán todos.':
    'Showing 200 of {{total}}. All will be imported.',
  'Importadas {{inserted}} de {{total}} ({{duplicates}} duplicadas omitidas).':
    'Imported {{inserted}} of {{total}} ({{duplicates}} duplicates skipped).',

  // PremiumGate
  'Plan gratis: máximo 2. Actualiza a Premium para más.':
    'Free plan: max 2. Upgrade to Premium for more.',

  // Configuración
  'Tu cuenta y preferencias': 'Your account and preferences',
  Perfil: 'Profile',
  'El nombre y la foto vienen de tu cuenta de Google.':
    'Your name and photo come from your Google account.',
  Apariencia: 'Appearance',
  Claro: 'Light',
  Oscuro: 'Dark',
  Sistema: 'System',
  Idioma: 'Language',
  Teléfono: 'Phone',
  'Sin teléfono conectado. Próximamente podrás vincular tu número con verificación por SMS.':
    'No phone connected. Soon you will be able to link your number with SMS verification.',
  Suscripción: 'Subscription',
  'Tienes acceso a todas las funciones.': 'You have access to all features.',
  'Plan gratuito. Premium desbloquea plan familiar, MSI/diferidos y rendimientos.':
    'Free plan. Premium unlocks family plan, installments and yields.',
  'Plan familiar': 'Family plan',
  'Tienes {{count}} invitación(es) pendiente(s).':
    'You have {{count}} pending invitation(s).',
  '(eres el jefe de familia)': '(you are the family head)',
  '(miembro)': '(member)',
  'Ver familia': 'View family',
  'No participas en ningún plan familiar.': 'You are not part of any family plan.',
  'Crearlo requiere Premium.': 'Creating one requires Premium.',
  'Saber más': 'Learn more',
  Sesión: 'Session',
  'Cerrar sesión': 'Sign out',

  // Stripe / suscripción
  'Gestionar suscripción': 'Manage subscription',
  'Hacerse Premium': 'Go Premium',
  'Abriendo…': 'Opening…',

  // Teléfono / SMS
  Cambiar: 'Change',
  'Número de teléfono': 'Phone number',
  'Código de verificación': 'Verification code',
  'Enviar código': 'Send code',
  'Enviando…': 'Sending…',
  'Verificando…': 'Verifying…',
  'Reenviar código': 'Resend code',
  'Reenviar en {{s}}s': 'Resend in {{s}}s',
  'Escribe tu número en formato internacional, ej. +5215512345678':
    'Enter your number in international format, e.g. +5215512345678',
  'El envío de SMS no está configurado. Contacta al administrador.':
    'SMS sending is not configured. Contact the administrator.',
  'No se pudo enviar el código.': 'Could not send the code.',
  'Código incorrecto.': 'Incorrect code.',
}
