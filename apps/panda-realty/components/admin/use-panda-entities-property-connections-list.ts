"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  type ConnectionSummary,
  type FavoriteProperty,
  connectionLabel,
  favoriteLabel,
  fetchConnectionDetail,
  fetchConnections,
  fetchFavoriteProperties,
} from "./panda-entities-property-connections-data"

export type SelectValue =
  | `pe:${number}` // linked connection (propertyEntityId)
  | `prop:${number}` // unlinked favorite (propertyListId)
  | ""

export function usePandaEntitiesPropertyConnectionsList(
  entityRowId: string,
  initialLinkPropertyListId?: string,
) {
  const [connections, setConnections] = useState<ConnectionSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [favoriteProperties, setFavoriteProperties] = useState<FavoriteProperty[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [favoritesError, setFavoritesError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ConnectionSummary | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const initialAutoSelectDoneRef = useRef(false)
  const initialPrefillDoneRef = useRef(false)

  const [selectValue, setSelectValue] = useState<SelectValue>("")

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch all favorite properties on mount
  useEffect(() => {
    setLoadingFavorites(true)
    fetchFavoriteProperties()
      .then((result) => {
        if (!mountedRef.current) return
        if (!result.ok) {
          setFavoritesError(result.errorMessage)
        } else {
          setFavoriteProperties(result.items)
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoadingFavorites(false)
      })
  }, [])

  // When initialLinkPropertyListId is provided, pre-select it once both favorites and connections load.
  // Guard on connections.length > 0 so this never fires on the initial empty-array state.
  useEffect(() => {
    if (!initialLinkPropertyListId) return
    if (loadingList || loadingFavorites) return
    if (connections.length === 0) return
    if (initialPrefillDoneRef.current) return
    initialPrefillDoneRef.current = true
    const propId = Number(initialLinkPropertyListId.trim())
    if (!Number.isFinite(propId) || propId <= 0) return
    const linked = connections.find((c) => c.propertyListId === propId)
    if (linked) {
      setSelectedId(linked.propertyEntityId)
      setSelectedDetail(linked)
      setSelectValue(`pe:${linked.propertyEntityId}`)
    } else {
      setSelectedId(null)
      setSelectedDetail(null)
      setSelectValue(`prop:${propId}`)
    }
  }, [initialLinkPropertyListId, loadingList, loadingFavorites, connections])

  const loadConnections = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const result = await fetchConnections(entityRowId)
      if (!mountedRef.current) return
      if (!result.ok) {
        setConnections([])
        setListError(result.errorMessage)
        setSelectedId(null)
        setSelectedDetail(null)
        setSelectValue("")
        return
      }
      setConnections(result.items)
      if (!initialAutoSelectDoneRef.current && result.items.length > 0) {
        initialAutoSelectDoneRef.current = true
        const latest = result.items.reduce((best, c) =>
          c.propertyEntityId > best.propertyEntityId ? c : best,
        )
        setSelectedId(latest.propertyEntityId)
        setSelectedDetail(latest)
        setSelectValue(`pe:${latest.propertyEntityId}`)
      }
    } finally {
      if (mountedRef.current) setLoadingList(false)
    }
  }, [entityRowId])

  useEffect(() => {
    void loadConnections()
  }, [loadConnections])

  useEffect(() => {
    if (selectedId == null) {
      setSelectedDetail(null)
      return
    }
    const listItem = connections.find((c) => c.propertyEntityId === selectedId)
    if (listItem?.propertyRef !== undefined) {
      setSelectedDetail(listItem)
      return
    }
    setLoadingDetail(true)
    fetchConnectionDetail(selectedId)
      .then((detail) => {
        if (mountedRef.current && detail) setSelectedDetail(detail)
      })
      .finally(() => {
        if (mountedRef.current) setLoadingDetail(false)
      })
    // connections intentionally omitted: only used for the initial listItem lookup;
    // re-running on list changes would clobber detail already fetched for the selected id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const refetchSelectedPropertyEntityDetail = useCallback(async () => {
    if (selectedId == null) return
    setLoadingDetail(true)
    try {
      const detail = await fetchConnectionDetail(selectedId)
      if (!mountedRef.current || !detail) return
      setSelectedDetail(detail)
      setConnections((prev) =>
        prev.map((c) =>
          c.propertyEntityId === selectedId ? { ...c, ...detail } : c,
        ),
      )
    } finally {
      if (mountedRef.current) setLoadingDetail(false)
    }
  }, [selectedId])

  const linkedPropertyListIdSet = useMemo(
    () => new Set(connections.map((c) => c.propertyListId).filter((id): id is number => id != null && id > 0)),
    [connections],
  )

  const favoritePropertyListIdSet = useMemo(
    () => new Set(favoriteProperties.map((f) => f.propertyListId)),
    [favoriteProperties],
  )

  const propertyListIdToEntityId = useMemo(
    () =>
      new Map(
        connections
          .filter((c): c is ConnectionSummary & { propertyListId: number } => c.propertyListId != null && c.propertyListId > 0)
          .map((c) => [c.propertyListId, c.propertyEntityId]),
      ),
    [connections],
  )

  const allFavoritesOptions = useMemo(() => {
    const linkedOptions: { value: SelectValue; label: string }[] = []
    const unlinkedOptions: { value: SelectValue; label: string }[] = []

    for (const fav of favoriteProperties) {
      const addr = favoriteLabel(fav)
      if (linkedPropertyListIdSet.has(fav.propertyListId)) {
        const peId = propertyListIdToEntityId.get(fav.propertyListId)
        if (peId != null) {
          linkedOptions.push({ value: `pe:${peId}`, label: `⭐ ${addr}` })
        }
      } else {
        unlinkedOptions.push({ value: `prop:${fav.propertyListId}`, label: addr })
      }
    }

    // Include connections whose property is not already covered by the favorites loop
    // (i.e. propertyListId is null, or the property is not in the favorites set).
    // Ensures the trigger always shows a proper label instead of the raw "pe:{id}" string.
    for (const conn of connections) {
      if (conn.propertyListId != null && favoritePropertyListIdSet.has(conn.propertyListId)) continue
      linkedOptions.push({ value: `pe:${conn.propertyEntityId}`, label: `⭐ ${connectionLabel(conn)}` })
    }

    linkedOptions.sort((a, b) => a.label.localeCompare(b.label))
    unlinkedOptions.sort((a, b) => a.label.localeCompare(b.label))

    return [...linkedOptions, ...unlinkedOptions]
  }, [favoriteProperties, favoritePropertyListIdSet, linkedPropertyListIdSet, propertyListIdToEntityId, connections])

  const selectedUnlinkedPropertyListId = useMemo(() => {
    if (!selectValue.startsWith("prop:")) return null
    const id = Number(selectValue.slice("prop:".length))
    return Number.isFinite(id) && id > 0 ? id : null
  }, [selectValue])

  const handleSelectChange = useCallback((value: SelectValue) => {
    setSelectValue(value)
    if (value.startsWith("pe:")) {
      const id = Number(value.slice("pe:".length))
      setSelectedId(Number.isFinite(id) && id > 0 ? id : null)
    } else {
      setSelectedId(null)
      setSelectedDetail(null)
    }
  }, [])

  const handleLinkFavoriteSuccess = useCallback(
    async (row: Record<string, unknown>) => {
      const newId = Number(row.propertyEntityId)
      await loadConnections()
      if (mountedRef.current && Number.isFinite(newId) && newId > 0) {
        setSelectedId(newId)
        setSelectValue(`pe:${newId}`)
      }
    },
    [loadConnections],
  )

  return {
    connections,
    setConnections,
    loadingList: loadingList || loadingFavorites,
    loadingFavorites,
    listError: listError ?? favoritesError,
    selectedId,
    selectedDetail,
    setSelectedDetail,
    loadingDetail,
    refetchSelectedPropertyEntityDetail,
    selectValue,
    handleSelectChange,
    handleLinkFavoriteSuccess,
    allFavoritesOptions,
    selectedUnlinkedPropertyListId,
  }
}
