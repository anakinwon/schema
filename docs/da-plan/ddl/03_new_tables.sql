CREATE TABLE dept_info (
    dept_no                text                           NOT NULL,
    dept_nm                text                           NOT NULL,
    use_yn                 character varying(1)           NULL,
    regr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_dept_info PRIMARY KEY (dept_no)
);

CREATE TABLE user_info (
    usr_no                 text                           NOT NULL,
    usr_nm                 text                           NOT NULL,
    dept_no                text                           NULL,
    phone_no               text                           NULL,
    eml_addr               text                           NULL,
    home_addr              text                           NULL,
    gnd_cd                 text                           NULL,
    join_dt                date                           NULL,
    quit_dt                date                           NULL,
    use_yn                 character varying(1)           NULL,
    regr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_info PRIMARY KEY (usr_no)
);

CREATE TABLE prod_info (
    prd_no                 text                           NOT NULL,
    prd_nm                 text                           NOT NULL,
    prd_typ_cd             text                           NULL,
    prd_price              numeric(15,2)                  NULL,
    use_yn                 character varying(1)           NULL,
    regr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prod_info PRIMARY KEY (prd_no)
);

CREATE TABLE prod_catal_info (
    prd_typ_cd             text                           NOT NULL,
    prd_typ_nm             text                           NOT NULL,
    up_prd_typ_cd          text                           NULL,
    use_yn                 character varying(1)           NULL,
    regr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prod_catal_info PRIMARY KEY (prd_typ_cd)
);

CREATE TABLE order_info (
    od_no                  text                           NOT NULL,
    usr_no                 text                           NOT NULL,
    prd_no                 text                           NOT NULL,
    od_cnt                 integer                        NOT NULL,
    od_dt                  date                           NOT NULL,
    od_sts_cd              text                           NULL,
    ccl_dt                 date                           NULL,
    ccl_sts_yn             character varying(1)           NULL,
    use_yn                 character varying(1)           NULL,
    regr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                timestamptz                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_order_info PRIMARY KEY (od_no)
);