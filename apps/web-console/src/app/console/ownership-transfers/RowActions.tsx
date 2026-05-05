'use client'

import { useTransition } from 'react'
import { Check, MoreHorizontal, X } from 'lucide-react'

import { cancelTransferAction, rejectTransferAction, settleTransferAction } from './actions'
import type { TransferState } from './store'

export function RowActions({ id, state }: { id: string; state: TransferState }) {
  const [pending, startTransition] = useTransition()

  if (state === 'pending_countersign') {
    return (
      <div className="ot-row__actions">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await settleTransferAction(id)
            })
          }
          className="ot-row__btn ot-row__btn--primary"
          aria-label="Countersign and settle"
          title="Countersign and settle"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Countersign</span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await rejectTransferAction(id)
            })
          }
          className="ot-row__btn ot-row__btn--ghost"
          aria-label="Reject"
          title="Reject"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <details className="ot-row__menu">
          <summary aria-label="More" className="ot-row__menu-trigger">
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <ul className="ot-row__menu-list">
            <li>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelTransferAction(id)
                  })
                }
                className="ot-row__menu-item ot-row__menu-item--danger"
              >
                Cancel transfer
              </button>
            </li>
          </ul>
        </details>
      </div>
    )
  }

  return (
    <details className="ot-row__menu ot-row__menu--alone">
      <summary aria-label="More" className="ot-row__menu-trigger">
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <ul className="ot-row__menu-list">
        <li>
          <button type="button" className="ot-row__menu-item">
            View VC envelope
          </button>
        </li>
        <li>
          <button type="button" className="ot-row__menu-item">
            Download proof
          </button>
        </li>
        <li>
          <button type="button" className="ot-row__menu-item">
            Open in audit log
          </button>
        </li>
      </ul>
    </details>
  )
}
