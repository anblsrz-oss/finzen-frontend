import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { ColorPicker } from '@/components/ui/ColorPicker'
import type { CategoryRow } from '@/types/db'

export function CategoriesPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')

  const categoriesQuery = useCategories(userId)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const allCategories = categoriesQuery.data || []
  const userCategories = allCategories.filter((c) => c.user_id === userId)
  const systemCategories = allCategories.filter((c) => !c.user_id)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setIcon('')
    setColor('')
    setKind('expense')
    setShowForm(false)
  }

  const startEdit = (cat: CategoryRow) => {
    setEditingId(cat.id)
    setName(cat.name)
    setKind(cat.kind)
    setIcon(cat.icon ?? '')
    setColor(cat.color ?? '')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !userId) return
    if (editingId) {
      updateCategory.mutate(
        { id: editingId, userId, name, icon, color },
        { onSuccess: resetForm },
      )
    } else {
      createCategory.mutate(
        { userId, name, kind, icon, color },
        { onSuccess: resetForm },
      )
    }
  }

  const handleDelete = (id: string) => {
    if (confirm(t('¿Eliminar esta categoría?'))) {
      deleteCategory.mutate({ id, userId: userId! })
    }
  }

  const pending = createCategory.isPending || updateCategory.isPending

  return (
    <>
      <PageHeader
        title={t('Categorías')}
        subtitle={t('Clasifica tus ingresos y gastos.')}
        actions={
          <Button
            onClick={() => {
              if (showForm) {
                resetForm()
              } else {
                setEditingId(null)
                setName('')
                setIcon('')
                setColor('')
                setKind('expense')
                setShowForm(true)
              }
            }}
          >
            {showForm ? t('Cancelar') : t('+ Agregar categoría')}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
          <div className="space-y-3">
            <Input
              label={t('Nombre')}
              placeholder={t('Ej: Gasolina')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              label={t('Tipo')}
              options={[
                { value: 'income', label: t('Ingreso') },
                { value: 'expense', label: t('Egreso') },
              ]}
              value={kind}
              onChange={(e) => setKind(e.target.value as 'income' | 'expense')}
              // El tipo no se cambia al editar (afectaría transacciones existentes).
              disabled={!!editingId}
            />
            <EmojiPicker label={t('Ícono')} value={icon} onChange={setIcon} />
            <ColorPicker label={t('Color')} value={color} onChange={setColor} />
            <Button onClick={handleSubmit} disabled={pending || !name.trim()}>
              {pending
                ? t('Guardando…')
                : editingId
                  ? t('Guardar cambios')
                  : t('Crear')}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {userCategories.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('Mis categorías')}
            </h3>
            <div className="grid gap-2">
              {userCategories.map((cat) => (
                <Card key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl"
                      style={cat.color ? { backgroundColor: `${cat.color}22` } : undefined}
                    >
                      {cat.icon || '•'}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{cat.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cat.kind === 'income' ? t('Ingreso') : t('Egreso')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
                      {t('Editar')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleteCategory.isPending}
                    >
                      {t('Eliminar')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {systemCategories.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('Categorías del sistema')}
            </h3>
            <div className="grid gap-2">
              {systemCategories.map((cat) => (
                <Card key={cat.id} className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || '•'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{cat.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cat.kind === 'income' ? 'Ingreso' : 'Egreso'}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {allCategories.length === 0 && (
          <Card className="border-dashed text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('Sin categorías.')}</p>
          </Card>
        )}
      </div>
    </>
  )
}
