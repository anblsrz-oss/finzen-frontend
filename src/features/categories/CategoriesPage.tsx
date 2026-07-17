import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function CategoriesPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [icon, setIcon] = useState('')

  const categoriesQuery = useCategories(userId)
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const allCategories = categoriesQuery.data || []
  const userCategories = allCategories.filter((c) => c.user_id === userId)
  const systemCategories = allCategories.filter((c) => !c.user_id)

  const handleCreate = async () => {
    if (!name.trim() || !userId) return
    createCategory.mutate(
      {
        userId,
        name,
        kind,
        icon,
      },
      {
        onSuccess: () => {
          setName('')
          setIcon('')
          setKind('expense')
          setShowForm(false)
        },
      },
    )
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta categoría?')) {
      deleteCategory.mutate({ id, userId: userId! })
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle="Clasifica tus ingresos y gastos."
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Agregar categoría'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 bg-slate-50">
          <div className="space-y-3">
            <Input
              label="Nombre"
              placeholder="Ej: Gasolina"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Tipo"
                options={[
                  { value: 'income', label: 'Ingreso' },
                  { value: 'expense', label: 'Egreso' },
                ]}
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as 'income' | 'expense')
                }
              />
              <Input
                label="Ícono (emoji)"
                placeholder="⛽"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
              />
              <div className="flex items-end gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={createCategory.isPending || !name.trim()}
                >
                  Crear
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {userCategories.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Mis categorías
            </h3>
            <div className="grid gap-2">
              {userCategories.map((cat) => (
                <Card key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon || '•'}</span>
                    <div>
                      <p className="font-medium text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-500">
                        {cat.kind === 'income' ? 'Ingreso' : 'Egreso'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleteCategory.isPending}
                  >
                    Eliminar
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {systemCategories.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Categorías del sistema
            </h3>
            <div className="grid gap-2">
              {systemCategories.map((cat) => (
                <Card key={cat.id} className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || '•'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-500">
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
            <p className="text-sm text-slate-500">Sin categorías.</p>
          </Card>
        )}
      </div>
    </>
  )
}
