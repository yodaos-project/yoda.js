cmake_minimum_required(VERSION 3.0)

macro(NA_UNSET_LOCALS)
  get_cmake_property(NA_LOCAL_VARS VARIABLES)
  if(NA_LOCAL_VARS)
    foreach(NA_LOCAL_VAR IN LISTS NA_LOCAL_VARS)
      if(NA_LOCAL_VAR MATCHES ^NA)
        unset(${NA_LOCAL_VAR})
      endif(NA_LOCAL_VAR MATCHES ^NA)
    endforeach()
    unset(NA_LOCAL_VAR)
    unset(NA_LOCAL_VARS)
  endif()
endmacro(NA_UNSET_LOCALS)


macro(node_addon_find_package NAME)
  NA_UNSET_LOCALS()

  # parse arguments, NA(node_addon_find_package)
  set(options
    REQUIRED
    STATIC
    SHARED
  )
  set(oneValueArgs)
  set(multiValueArgs
    HINTS
    HEADERS
    ARCHIVES
    PATH_SUFFIX
    INC_PATH_SUFFIX
    LIB_PATH_SUFFIX
  )
  cmake_parse_arguments(NA "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN})

  if(NA_REQUIRED)
    set(NA_LOCAL_LOGV FATAL_ERROR)
  else()
    set(NA_LOCAL_LOGV STATUS)
  endif()

  if(NA_STATIC)
    set(NA_LOCAL_LIBRARY_TYPE STATIC)
  elseif(NA_SHARED)
    set(NA_LOCAL_LIBRARY_TYPE SHARED)
  else()
    message(FATAL_ERROR "${NAME}: Not set library type")
  endif()

  foreach(NA_LOCAL_HEADER IN LISTS NA_HEADERS)
    unset(NA_LOCAL_INCLUDE_DIR CACHE)
    find_path(NA_LOCAL_INCLUDE_DIR
      NAMES ${NA_LOCAL_HEADER}
      HINTS ${NA_HINTS}
      PATH_SUFFIXES ${NA_INC_PATH_SUFFIX} ${NA_PATH_SUFFIX}
    )
    if(NA_LOCAL_INCLUDE_DIR)
      list(APPEND NA_LOCAL_INCLUDE_DIRECTORIES ${NA_LOCAL_INCLUDE_DIR})
      message(STATUS "${NAME}: found ${NA_LOCAL_HEADER} in path ${NA_LOCAL_INCLUDE_DIR}")
    else()
      message(${NA_LOCAL_LOGV} "${NAME}: Not found ${NA_LOCAL_HEADER}")
    endif()
  endforeach()

  if(NA_LOCAL_INCLUDE_DIRECTORIES)
    list(REMOVE_DUPLICATES NA_LOCAL_INCLUDE_DIRECTORIES)
  endif()

  foreach(NA_LOCAL_LIBNAME IN LISTS NA_ARCHIVES)
    unset(NA_LOCAL_LIB_PATH CACHE)
    set(NA_LOCAL_LIBCOMPNAME ${NA_LOCAL_LIBNAME})
    if(NA_STATIC)
      set(NA_LOCAL_LIBCOMPNAME lib${NA_LOCAL_LIBNAME}.a)
    endif(NA_STATIC)

    find_library(
      NA_LOCAL_LIB_PATH
      NAMES ${NA_LOCAL_LIBCOMPNAME}
      HINTS ${NA_HINTS}
      PATH_SUFFIXES ${NA_LIB_PATH_SUFFIX} ${NA_PATH_SUFFIX}
    )

    if(NA_LOCAL_LIB_PATH)
      list(APPEND ${NAME}_LIBS ${NAME}::${NA_LOCAL_LIBNAME})
      message(STATUS "${NAME}: found ${NA_LOCAL_LIBNAME} at path ${NA_LOCAL_LIB_PATH}")

      add_library(${NAME}::${NA_LOCAL_LIBNAME} ${NA_LOCAL_LIBRARY_TYPE} IMPORTED)
      set_target_properties(${NAME}::${NA_LOCAL_LIBNAME} PROPERTIES
        IMPORTED_LOCATION "${NA_LOCAL_LIB_PATH}"
        INTERFACE_INCLUDE_DIRECTORIES "${NA_LOCAL_INCLUDE_DIRECTORIES}"
      )
    else()
      message(${NA_LOCAL_LOGV} "${NAME}: Not found ${NA_LOCAL_LIBNAME}")
    endif()
  endforeach()

  NA_UNSET_LOCALS()
endmacro(node_addon_find_package)

macro(add_node_addon NODE_ADDON_NAME)
  cmake_parse_arguments(NODE_ADDON "" "NAME;" "SOURCES" ${ARGN})
  add_library(${NODE_ADDON_NAME} MODULE ${NODE_ADDON_SOURCES})

  set_target_properties(${NODE_ADDON_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    OUTPUT_NAME ${NODE_ADDON_NAME})

  if(APPLE)
    set_target_properties(${NODE_ADDON_NAME} PROPERTIES
                          LINK_FLAGS "-rdynamic -undefined dynamic_lookup")
  else()
    set_target_properties(${NODE_ADDON_NAME} PROPERTIES
                          LINK_FLAGS "-rdynamic -Wl,--unresolved-symbols=ignore-all")
  endif()

  set(NODEJS_VARIANT node CACHE STRING "Node.js variant to be used")
  find_path(NODE_API_INCLUDE_DIRS
    NAMES node_api.h
    PATH_SUFFIXES ${NODEJS_VARIANT}
  )
  find_path(NAPI_INCLUDE_DIRS
    NAMES napi.h napi-inl.h
  )
  target_include_directories(${NODE_ADDON_NAME} PRIVATE
    ${NODE_API_INCLUDE_DIRS}
    ${NAPI_INCLUDE_DIRS}
  )
endmacro(add_node_addon)
